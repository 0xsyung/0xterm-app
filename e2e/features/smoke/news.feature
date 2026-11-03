@smoke @readonly @mobile
Feature: NEWS surface
  INVEST NEWS must render and category chips must scroll on mobile.

  Scenario: NEWS headlines or empty and category chips scroll to DeFi
    Given NEWS RSS mirrors are stubbed
    And the app is open on the terminal surface
    When the user opens the NEWS surface
    Then the NEWS surface renders without crash
    And NEWS category chips scroll horizontally so DeFi is reachable
