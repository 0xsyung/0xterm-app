@smoke @readonly @mobile
Feature: PORTFOLIO surface
  Disconnected PORTFOLIO shows empty state; CONNECT stays visible.

  Scenario: PORTFOLIO disconnected empty with CONNECT visible
    Given the app is open on the terminal surface
    When the user opens the PORTFOLIO panel
    Then the PORTFOLIO panel shows disconnected empty state
    And the CONNECT control is visible
