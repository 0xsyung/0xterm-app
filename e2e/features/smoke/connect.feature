@smoke @readonly @mobile
Feature: CONNECT sheet
  CONNECT opens the wallet sheet then dismisses — no wallet connect or txs.

  Scenario: CONNECT opens sheet then dismiss
    Given the app is open on the terminal surface
    When the user opens the CONNECT sheet
    Then the wallet sheet is visible
    When the user dismisses the wallet sheet
    Then the wallet sheet is closed
    And the CONNECT control is visible
