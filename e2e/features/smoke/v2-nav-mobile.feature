@smoke @readonly @mobile
Feature: V2 primary nav on mobile

  Scenario: All primary tabs are fully reachable at 390×844
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    Then each primary tab Holdings, PnL, Move, News, Reports is fully visible after scrollIntoViewIfNeeded
    And the Reports tab label is exactly Reports and is not clipped to REPORT
    And each tab is activatable and shows its screen
