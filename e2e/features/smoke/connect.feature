@smoke @readonly @mobile
Feature: V2 Connect sheet
  Connect opens the wallet sheet then dismisses — no wallet connect or txs.

  Scenario: Connect opens sheet then dismiss
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    And the user opens the Connect sheet
    Then the wallet sheet is visible
    When the user dismisses the wallet sheet
    Then the wallet sheet is closed
    And the Connect control is visible
