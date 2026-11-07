# Head In the Clouds

Hack Format: Chrome Extension

Theme: Head in the Clouds

Purpose: To help people who often get distracted stay focused and on topic
Value/What we do different:


Detailed Description:

This chrome extension will allow the user to create a blacklist of websites; whenever the user visits one of these websites, the extension will create a pop-up with a warning notice that a blacklisted site is being used. If the user continues to remain on the site, the extension will log the amount of time they spend on it. At the end of the day, the extension can give a summary of which websites were used, and for how long.

Example:

https://www.youtube.com/  ⇐==== user adds this website URL to their blocked list 

https://www.youtube.com/watch?v=o0zQQiMQVn8&list=PLeSImI9eZJ99fcLYBjhTGBhPx4FgxFZXv ⇐===== since this URL contains “https://www.youtube.com/” we block it

Technical Needs:

Frontend(UI/UX)🌧️

  - React
  - Vite
  - Node JS

Configuring/Editing the extension profile

List of websites you want to block
Ability to add more websites to the list
Ability to remove websites to the list
Time tracker for websites on the list

Using the website

  - Blocked screen

Backend/Database (Supabase)

	User

    - email, username, password
    - Dictionary [key : value]
        - [blocked website URL : time spent on it today]

Optional Extensions:
Wall of Shame: Extension creates a leaderboard of who’s the least distracted
Automatically redirect them from blocked website to a specified productive website
LLM Shoehorn: an LLM can review a user’s summary and make suggestions
Graph of distraction per day over a week
