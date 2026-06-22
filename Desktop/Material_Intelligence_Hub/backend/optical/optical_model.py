"""
optical_model.py

Trains and serves ALL FOUR models benchmarked in models.ipynb:
  - xgboost        : XGBRegressor
  - histgb         : HistGradientBoostingRegressor
  - neural_net     : MLPRegressor   (this was the only one the old version trained)
  - random_forest  : RandomForestRegressor

All four are trained on the same feature set (x_val + deposition params +
element fractions + en/an) and the same target (y_val), exactly like the
notebook. 10-fold CV metrics (MAE, MSE, RMSE, R2, MAPE, Explained Variance)
are computed for each so the frontend can render a comparison chart.
"""

import pandas as pd
import numpy as np
import os

from sklearn.impute import SimpleImputer
from sklearn.neural_network import MLPRegressor
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.model_selection import KFold, cross_validate
from xgboost import XGBRegressor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ==========================================
# FEATURE DEFINITION (unchanged — matches models.ipynb column slicing)
# ==========================================

PARAM_COLS = ["dep_temp", "anneal_temp", "anneal_time", "thickness", "temp", "pressure"]

ELEMENT_COLS = [
    "C","N","H","Sn","I","B","Cr","Sb","Se","Cu","Cd","S","Ag","Al",
    "O","Si","Ti","K","Ba","Na","As","Hf","V","F","Mg","Zn","Yb","La",
    "Zr","Pr","Gd","Sc","Co","Ni","Pb","Mo","Ga","P","In","Bi","Te",
    "Er","Tm","Ge","Ir","Br","Cl","Sr","W","Nb","Ta","Tl","Cs","Li",
    "Ca","Mn","Ce","Dy","Y","Ho","Nd","Lu","Fe","Eu","Au","Hg","Sm"
]

FEATURE_COLS = ["x_val"] + PARAM_COLS + ELEMENT_COLS + ["en", "an"]

# ==========================================
# MODEL REGISTRY  (hyperparameters copied straight from models.ipynb)
# ==========================================

MODEL_LABELS = {
    "xgboost":       "XGBoost",
    "histgb":        "HistGradient Boosting",
    "neural_net":    "Neural Network (MLP)",
    "random_forest": "Random Forest",
}

def _model_factory(name: str):
    if name == "xgboost":
        return XGBRegressor(learning_rate=0.7, n_estimators=100, max_depth=12,
                             subsample=0.8, random_state=42)
    if name == "histgb":
        return HistGradientBoostingRegressor(learning_rate=0.7, max_iter=100,
                                              max_depth=12, random_state=42)
    if name == "neural_net":
        return MLPRegressor(hidden_layer_sizes=(64, 51), random_state=1,
                             max_iter=500, early_stopping=True,
                             validation_fraction=0.1)
    if name == "random_forest":
        return RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    raise ValueError(f"Unknown model '{name}'")


# ==========================================
# MODULE STATE
# ==========================================

models = {}          # name -> fitted estimator (trained on full data, used for serving)
metrics = {}          # name -> dict of CV metrics (used for the comparison chart)
imputer = None
feature_columns = None
is_ready = False     # flips to True once all 4 models have finished training


def _cv_metrics(name: str, X, y) -> dict:
    kf = KFold(n_splits=10, shuffle=True, random_state=42)
    scoring = {
        "MAE":  "neg_mean_absolute_error",
        "MSE":  "neg_mean_squared_error",
        "RMSE": "neg_root_mean_squared_error",
        "R2":   "r2",
        "MAPE": "neg_mean_absolute_percentage_error",
        "ExplainedVariance": "explained_variance",
    }
    results = cross_validate(_model_factory(name), X, y, cv=kf, scoring=scoring)
    return {
        "mae":                round(float(-np.mean(results["test_MAE"])), 5),
        "mse":                round(float(-np.mean(results["test_MSE"])), 5),
        "rmse":               round(float(-np.mean(results["test_RMSE"])), 5),
        "r2":                 round(float(np.mean(results["test_R2"])), 5),
        "mape":               round(float(-np.mean(results["test_MAPE"])), 5),
        "explained_variance": round(float(np.mean(results["test_ExplainedVariance"])), 5),
    }


def train_optical_model():
    """Trains all 4 models + computes their CV metrics. Call once on backend startup
    (intended to be run in a background thread — see main.py)."""
    global models, metrics, imputer, feature_columns, is_ready

    data = pd.read_json(os.path.join(BASE_DIR, "datamodel_enan.json"))
    data.replace("", np.nan, inplace=True)

    for col in FEATURE_COLS + ["y_val"]:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors="coerce")

    X = data[FEATURE_COLS].copy()
    y = data["y_val"].copy()

    mask = y.notna()
    X = X[mask]
    y = y[mask]

    feature_columns = FEATURE_COLS

    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)

    for name in MODEL_LABELS:
        try:
            metrics[name] = _cv_metrics(name, X_imputed, y)
        except Exception as e:
            print(f"⚠️  CV metrics failed for {name}: {e}")
            metrics[name] = None

        try:
            est = _model_factory(name)
            est.fit(X_imputed, y)
            models[name] = est
            print(f"✅ trained {MODEL_LABELS[name]}")
        except Exception as e:
            print(f"⚠️  training failed for {name}: {e}")

    print(f"✅ Optical models ready | y_val range: {y.min():.4f} – {y.max():.4f}")
    is_ready = True


def models_ready() -> bool:
    return is_ready


def _build_row(features: dict):
    row = {col: float(features.get(col, 0) or 0) for col in feature_columns}
    df = pd.DataFrame([row])
    return imputer.transform(df)


def predict_optical(features: dict, model_name: str = "neural_net") -> float:
    """Predict using a single named model (xgboost | histgb | neural_net | random_forest)."""
    if not is_ready:
        raise RuntimeError("Optical models are still training on the backend. Try again in a moment.")
    if model_name not in models:
        raise RuntimeError(
            f"Unknown or untrained model '{model_name}'. "
            f"Available: {list(models.keys())}"
        )
    X_imputed = _build_row(features)
    return float(models[model_name].predict(X_imputed)[0])


def predict_optical_all(features: dict) -> dict:
    """Predict using all 4 models at once — used for the comparison view."""
    if not is_ready:
        raise RuntimeError("Optical models are still training on the backend. Try again in a moment.")
    X_imputed = _build_row(features)
    return {
        name: float(est.predict(X_imputed)[0])
        for name, est in models.items()
    }


def get_model_metrics() -> dict:
    """Returns CV metrics for all 4 models, for the comparison chart."""
    if not is_ready:
        return {}
    return {
        name: {"label": MODEL_LABELS[name], **(metrics.get(name) or {})}
        for name in MODEL_LABELS
    }