# Live Total Timer:

## Workflow

    - user tries to enter their blocked site
    - we redirect them to blocked.html
    - They have two options: go back a page or access their blocked site (Continue button)
    - If they choose to access their blocked site, we start a live timer that 
        counts how much time they're spending in this session
    - The live timer is displayed in the "Overview" tab in the toolbar in index.html across from the website name
    - This technically starts at the total time (from a previous session)
    - Paused if:
        - user is not currently on the tab
        - tab is closed
    - The list of these websites and time spent is sorted (from top to bottom) by:
        - Websites which have the most screen time AND are live (currently increasing)
        - Websites that are live
        - Websites that have the most screen time
        - Websites that have lesser screen time
        - Websites that have the least screen time
    - All websites have default time of 00:00:00 if starting the first time


PLEASE STATE ANY ASSUMPTIONS OR QUESTIONS IMMEDIETLEY WHEN MAKING