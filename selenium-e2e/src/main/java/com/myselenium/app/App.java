package com.myselenium.app;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import java.net.URL;

/**
 * hello selenium
 *
 */
public class App 
{
    public static void main(String[] args) {
        try {
            ChromeOptions options = new ChromeOptions();
            WebDriver driver = new RemoteWebDriver(new URL("http://localhost:4444/wd/hub"), options);
            // Perform your test actions with the WebDriver instance
            driver.quit();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
