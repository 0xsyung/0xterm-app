@smoke @readonly @mobile
Feature: iPhone Safari input focus must not flash white (#314)
  Form controls stay ≥16px; document paints Finance bg under keyboard resize.

  Scenario: Document root paints Finance background
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    Then the document root paints Finance background #0b0d10
    And the viewport root paints Finance background

  Scenario: News search control is ≥16px and focus keeps Finance paint
    Given I open the V2 app at viewport 390×844
    When the shell finishes initializing
    And the user opens the News surface
    Then the News search control computed font-size is at least 16px
    When the user focuses the News search control
    Then the document root paints Finance background #0b0d10
    And the viewport root paints Finance background
