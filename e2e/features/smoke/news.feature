@smoke @readonly @mobile
Feature: V2 News surface
  News must render on mobile; category chips must scroll horizontally.

  Scenario: News headlines or empty and category chips scroll to DeFi
    Given NEWS RSS mirrors are stubbed
    And I open the V2 app at viewport 390×844
    When the shell finishes initializing
    And the user opens the News surface
    Then the News surface renders without crash
    And NEWS category chips scroll horizontally so DeFi is reachable
    And primary nav chips scroll horizontally so News and Reports are reachable
