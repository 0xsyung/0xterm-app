@smoke @readonly @mobile
Feature: FORENSIC surface
  FORENSIC mode must open SCREEN without crashing.

  Scenario: FORENSIC SCREEN is visible
    Given the app is open on the terminal surface
    When the user opens the FORENSIC surface
    Then the FORENSIC SCREEN is visible without crash
