@smoke @readonly @mobile
Feature: V2 Holdings disconnected
  Disconnected Holdings shows empty Connect CTA; Connect stays visible.

  Scenario: Holdings disconnected empty with Connect visible
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    Then the Holdings screen shows disconnected empty state
    And the Connect control is visible
