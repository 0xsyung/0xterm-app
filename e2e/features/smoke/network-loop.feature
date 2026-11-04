@smoke @readonly @mobile
Feature: V2 unsupported-network modal must not trap (#310)
  Disconnected empty-state never auto-opens AppKit UnsupportedChain.
  Connect sheet still opens and dismisses without looping.

  Scenario: Disconnected empty-state never auto-opens UnsupportedChain
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    Then the AppKit modal stays closed for at least 2 seconds
    And the AppKit UnsupportedChain view is not open
    And the Connect control is visible

  Scenario: Connect sheet opens and dismisses without UnsupportedChain loop
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    And the user opens the Connect sheet
    Then the wallet sheet is visible
    And the AppKit UnsupportedChain view is not open
    When the user dismisses the wallet sheet
    Then the wallet sheet is closed
    And the AppKit UnsupportedChain view is not open
    And the Connect control is visible
