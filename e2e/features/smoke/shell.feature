@smoke @readonly @mobile
Feature: Shell boot
  Mobile terminal must load past init without crashing.

  Scenario: Load app past init on mobile
    Given the app is open on the terminal surface
    Then the nav strip is visible past init
