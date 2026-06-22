from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import undetected_chromedriver as uc
import time
from selenium import webdriver


def driver_setup():
    options = uc.ChromeOptions()
    options.add_experimental_option("prefs", {
        "profile.managed_default_content_settings.images": 2  # block images
    })
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-gpu")
    capabilities = webdriver.DesiredCapabilities.CHROME.copy()
    capabilities['pageLoadStrategy'] = 'eager'  # This ensures page load considers DOM ready only
    # Launch the undetected driver with the capabilities and options
    driver = uc.Chrome(options=options)
    driver.execute_cdp_cmd("Network.enable", {})
    driver.execute_cdp_cmd("Network.setBlockedURLs", {
        "urls": [
            "*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg",  # Images and stylesheets
            "*.woff", "*.woff2", "*.ttf", "*.ico",  # Fonts
            "*.mp4", "*.webm", "*.avi", "*.mov", "*.mkv",  # Videos
            "*.json", "*.xml"  # Optional: Block large API responses if not required
        ]
    })
    driver.execute_script("""
            var videos = document.querySelectorAll('video');
            videos.forEach(function(video) {
                video.autoplay = false;  // Disable autoplay
                video.pause();           // Pause video if it's playing
            });
        """)

    return driver


# def article_scraper(driver, link):
    # try:
    #     driver.get(link)
    #     name = driver.title.strip()
    #     print(f"Processing site: {name}")
    #     wait = WebDriverWait(driver, 5)  # Timeout after 20 seconds
    #     wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    #     print("Page Loaded")

    #     previous_height = driver.execute_script("return document.body.scrollHeight")
    #     scroll_attempts = 0  # Count the number of scroll attempts without content loading
    #     load_clicks = 0
    #     show_clicks = 0

    #     while True:
    #         articles = []
    #         try:
    #             articles = wait.until(
    #                 EC.presence_of_all_elements_located((By.CSS_SELECTOR, "article.mg-result-item.px-2.py-3.border-top"
    #                                                                       ".border-bottom")))
    #             print(f"articles length = '{len(articles)}' ")

    #         except Exception as e:
    #             print(f"Failed to locate articles: {e}")

    #         for article in articles:
    #             try:
    #                 article_name = article.find_element(By.CSS_SELECTOR, "a.no-underline").text.strip()
    #                 # show_abstract = WebDriverWait(article, 5).until(
    #                 #     EC.element_to_be_clickable((By.CSS_SELECTOR, "button.bg-transparent.p-0.my-3.text-secondary"
    #                 #                                                  ".border-0.block.cursor-pointer"))
    #                 # )
    #                 # driver.execute_script("arguments[0].click();", show_abstract)
    #                 show_clicks += 1

    #                 # abstract_content = WebDriverWait(article, 5).until(
    #                 #     EC.visibility_of_element_located((By.CSS_SELECTOR, "div.mb-3"))
    #                 # )

    #                 with open("abstracts.txt", "a", encoding="utf-8") as file:  # "a" mode ensures continuous writing
    #                     file.write(f"Article: {article_name}\n")
    #                     # file.write(f"Abstract: {abstract_content.text.strip()}\n\n")  # Double line break for separation
    #                 print(f"Abstract saved for: {article_name}")

    #             except Exception:
    #                 print("ERROR OCCURED WHILE PARSING ARTICLES")
    #                 break

    #         print(f"\n articles passed = '{show_clicks}'")

    #         try:
    #             load_next_button = WebDriverWait(driver, 5).until(
    #                 EC.element_to_be_clickable((By.CSS_SELECTOR, "a.border-solid.relative.inline-flex.items-center"
    #                                                              ".rounded-r-md.border.border-dividers.bg-white.px-2.py-2.font-medium"))
    #             )
    #             driver.execute_script("arguments[0].scrollIntoView(true);", load_next_button)
    #             driver.execute_script("arguments[0].click();", load_next_button)
    #             time.sleep(2)
    #             load_clicks += 1
    #             scroll_attempts = 0  # Reset scroll attempts after a successful load
    #         except Exception:
    #             print("'Load More' button not found or no more content to load.")
    #             driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    #             scroll_attempts += 1

    #         if scroll_attempts >= 1:  # After a few failed scrolls, stop
    #             print("No more new content loaded after several attempts. Stopping.")
    #             break

    # except Exception:
    #     print("Error fetching")
def article_scraper(driver, link):
    try:
        driver.get(link)
        name = driver.title.strip()
        print(f"Processing site: {name}")
        wait = WebDriverWait(driver, 5)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        print("Page Loaded")

        while True:
            articles = driver.find_elements(By.CSS_SELECTOR, "article.mg-result-item")
            print(f"Found {len(articles)} articles")

            for article in articles:
                try:
                    keywords_container = article.find_elements(By.CSS_SELECTOR, "div.text-gray-light span a")
                    keywords = [keyword.text.strip() for keyword in keywords_container]
                    if keywords:
                        with open("keywords.txt", "a", encoding="utf-8") as file:
                            file.write(f"Keywords: {', '.join(keywords)}\n")
                        print(f"Keywords saved: {', '.join(keywords)}")
                except Exception:
                    print("Error occurred while extracting keywords")

            try:
                load_next_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "a.border-solid.relative.inline-flex.items-center.rounded-r-md"))
                )
                driver.execute_script("arguments[0].click();", load_next_button)
                time.sleep(2)
            except Exception:
                print("'Load More' button not found or no more content to load.")
                break
    except Exception as e:
        print(f"Error fetching: {e}")

def main():
    driver = driver_setup()
    # output_file = r"C:\Users\piyus\Desktop\tuttifrutti\CommentatorNames_Images_from_games.xlsx"
    link = r"https://www.mrs.org/meetings-events/annual-meetings/archive/meeting/presentations/2022-mrs-spring-meeting?page" \
           r"=1&categories=&symposium=&sessiontype=&topicalcluster=&sessiondate="
    try:
        article_scraper(driver, link)
        # links_file = "new.xlsx"
        # links = read_links(links_file)
        #
        # for link in links:
        #     game_name, names_extracted, images_extracted = extract_names_commentator(driver, link)
        #     if names_extracted:  # Only save if names are found
        #         save_data_incrementally(output_file, game_name, names_extracted, images_extracted)
        #         count += 1
        #     else:
        #         print(f"No commentators found for game: {game_name}. Skipping save.")
        #         break
        #     print(f"Finished processing and saving data for game: {game_name}\n")

    finally:
        driver.quit()
        print("Driver closed.")


if __name__ == "__main__":
    main()
