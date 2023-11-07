import { loginForTeacher } from '../../tools/login/login.js'

describe('customize class page', () => {
    beforeEach(() => {
      loginForTeacher("teacher4");
      // ensureIsSecondTeacher("teacher1", "teacher2")
      // await ensureClass();
      cy.getBySel('view_class_link').first().click(); // Press on view class button
      cy.getBySel('customize_class_button').click(); // Press customize class button

      // Remove any customizations that already exist to get the class into a predictable state
      // This always throws up a modal dialog
      cy.intercept('/for-teachers/restore-customizations*').as('restoreCustomizations');      
      cy.getBySel('remove_customizations_button').click();
      cy.getBySel('modal_yes_button').click();
      cy.wait('@restoreCustomizations');
    });

    it('checks the option checkboxes', () => {
      // following code checks every single checkbox on the current page:
      cy.get('[type="checkbox"]').parent('.switch').click({ multiple: true });
      cy.get('[type="checkbox"]').should('be.not.checked')
      cy.get('[type="checkbox"]').parent('.switch').click({ multiple: true });
      cy.get('[type="checkbox"]').should('be.checked')
    });

    it('goes back to the view class page', () => {
      cy.getBySel('back_to_class')
      .should('be.visible')
      .should('not.be.disabled')
      .click();
      // We should be in the view class page
      cy.url()
        .should('include', Cypress.config('baseUrl') + Cypress.env('class_page'));
    });

    it('level 1 should be visible by default, and the level dropdown changes which adventures are displayed', () => {
      // Click on level 1
      cy.getBySel('adventures')
        .select('1')
        .should('have.value', '1');

      // level 1 should be visible and level 2 shouldn't exist
      cy.getBySel("level-1")
        .should('be.visible');

      cy.getBySel("level-2")
        .should('not.exist');

      cy.getBySel('adventures')
        .select('2')
        .should('have.value', '2');

      cy.get("*[data-cy='level-2']")
        .should('be.visible');

        cy.get("*[data-cy='level-1']")
        .should('not.exist');
    });

    it('tests if the opening tests are not empty', () => {
      // The following line has a bug in cypress:
      // cy.getBySel("opening_date_level_" + index).type("2023-01-01").should("have.value", "2023-01-01")
      // The following tests only checks if the field is not empty using a for loop:
      var levelarray = Array.from({length:18},(v, k)=>k+1) // length reflects how many levels there are
      cy.wrap(levelarray).each((index) => {
        cy.getBySel("opening_date_level_" + index)
          .type("2023-01-01")
          .invoke('val').then((text) => {
            expect('2023-01-01').to.equal(text);
          });
      });
    });

    it('the quiz score holds the value typed to it', () => {
      // testing quiz score feature
      cy.getBySel('quiz_input').clear().type("50").should("have.value", "50");
    });


    it('removes the adventure and checks that it is added to the available adventures drop down and removed from the dragger', () => {

      // Click on level 2
      cy.getBySel("adventures")
        .select('2')
        .should('have.value', '2');

      // Finding this makes sure that level-2 has been loaded
      cy.get('[data-cy="level-2"]');

      // The available adventures dropdown should only include the default option
      // but it may also have teacher-specific adventures
      cy.getBySel("available_adventures_current_level")
        .children()
        .then($children => $children.length)
        .as('startLength')
        .then(startLength => {
          // store the name of the adventure we're going to delete
          cy.get('[data-cy="level-2"] div:first input')
            .invoke('attr', 'value')
            .as('adventure')
            .then(adventure => {
              // Get the first adventure, and click its remove button
              cy.get('[data-cy="level-2"] div:first [data-cy="hide"]')
                .click();

              // The available adventures dropdown should now include the new adventure
              cy.getBySel("available_adventures_current_level")
                .children()
                .should('have.length', startLength + 1);

              // the added option should be the last
              cy.get('[data-cy="available_adventures_current_level"] option:last')
                .should('have.value', `${adventure}`);

              // after selecting the adventure, it shouldn't be among the options
              cy.getBySel("available_adventures_current_level")
                .select(`${adventure}`)

              cy.getBySel("available_adventures_current_level")
                .children()
                .should('have.length', startLength);

              // the adventure should now be last
              cy.get('[data-cy="level-2"] div:last input')
                .should('have.value', `${adventure}`)
          });
      });
    });

    it('saves the customizations and then removes them', () => {
      //  We save the customizations first
      cy.getBySel("save_customizations")
        .should('be.visible')
        .should('not.be.disabled')
        .click();

      cy.getBySel('modal_alert_text')
        .should('be.visible');

      // Now that it has customizations we can remove them
      cy.getBySel('remove_customizations_button')
        .should('be.visible')
        .should('not.be.disabled')
        .click();

      cy.getBySel('modal_yes_button')
        .should('be.visible')
        .click();
    });

    it('Disabling current level displays a message', () => {
      cy.getBySel('level-1').should('be.visible');
      cy.get('#state-disabled').should('not.be.visible');

      cy.get('#enable_level_1').parent('.switch').click();
      cy.get('#state-disabled').should('be.visible');
    });

    it('Clicking the Reset button displays a confirm dialog', () => {
      /**
       * At the beggining, the Parrot adventure should be in the level 1's adventures
       */
      selectLevel('1');
      cy.get('#htmx-modal').should('not.exist');
      cy.get(`*[data-cy="level-1"] div[data-cy='parrot'] *[data-cy="hide"]`).click();
      cy.getBySel('parrot').should('not.exist');

      cy.getBySel('reset_adventures').click();
      cy.getBySel('confirm_modal').should('be.visible');
      cy.getBySel('htmx_modal_yes_button').click();
      cy.getBySel('parrot').should('be.visible');
    });

    describe('an adventure that is hidden', () => {
      const hiddenAdventure = 'parrot';

      beforeEach(() => {
        selectLevel('1');
        cy.get(`*[data-cy="level-1"] div[data-cy='${hiddenAdventure}'] *[data-cy="hide"]`).click();
      });

      it('disappears from the tab list', () => {
        cy.get(`input[value="${hiddenAdventure}"]`).should('not.exist');
      });

      it('can be re-added from the right dropdown list', () => {
        cy.getBySel('available_adventures_current_level').children(`*[value='${hiddenAdventure}']`).should('exist');

        cy.getBySel('available_adventures_current_level').select(`${hiddenAdventure}`);

        cy.get(`div[data-cy="${hiddenAdventure}"]`).should('exist');
      });

    });
  });

  function selectLevel(level) {
    cy.getBySel("adventures")
      .select(level)
      .should('have.value', level);
  }