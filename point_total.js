/**
 * Created by John on 2016-02-22.
 */
/*globals require */
/*eslint max-len: 0, no-underscore-dangle: 0 */
tau.mashups
    .addDependency('jQuery')
    .addDependency('Underscore')
    .addDependency('tau/core/class')
    .addDependency('tau/configurator')

    .addMashup(function($, _, Class, configurator) {

        //alert(window.loggedUser.name);

        /*
         *  Utility function used for debugging
         */
        function notifyEvent(msg) {
            // alert('The Cards Have Loaded');
            console.log(msg);
        }

        'use strict';
        var appConfigurator;
        configurator.getGlobalBus().on('configurator.ready', function(e) {

            var configurator_ = e.data;

            if (configurator_._id && !configurator_._id.match(/global/) && !appConfigurator) {

                appConfigurator = configurator_;

            }

        });

        var reg = configurator.getBusRegistry();

        var addBusListener = function(busName, eventName, listener) {

            reg.on('create', function(e, data) {

                var bus = data.bus;
                if (bus.name === busName) {
                    bus.on(eventName, listener);
                }
            });

            reg.on('destroy', function(e, data) {

                var bus = data.bus;
                if (bus.name === busName) {
                    bus.removeListener(eventName, listener);
                }
            });

        };

        // Do we really need this?  I don't think so.
        var nestedBoardsConfig = {
            userstory: [{
                type: 'bug',
                name: 'Bugs Board'
            }, {
                type: 'task',
                name: 'Tasks Board'
            }],

            feature: [{
                type: 'userstory',
                name: 'Stories Board'
            }]

            //testplan: [{
            //    type: 'testplanrun',
            //    name: 'View Plan Runs'
            //}],

            //iteration: [{
            //    type: 'bug',
            //    name: 'Iteration Bugs'
            //}, {
            //    type: 'userstory',
            //    name: 'Iteration Stories'
            //}],

            //release: [{
            //    type: 'bug',
            //    name: 'Release Bugs'
            //}, {
            //    type: 'feature',
            //    name: 'Release Features'
            //}, {
            //    type: 'userstory',
            //    name: 'Release Stories'
            //}],

            //teamiteration: [{
            //    type: 'bug',
            //    name: 'Bugs Board (TI)'
            //}, {
            //    type: 'userstory',
            //    name: 'Stories Board (TI)'
            //}]
        };

        var Mashup = Class.extend({

            init: function() {

                // Add bus listener to be notified when cards are loaded
                addBusListener('board_plus', 'cardsFullyLoaded', function() {
                    // The cards have all loaded.  Render the indicator.
                    this.renderPointTotalIndicator();
                }.bind(this));

                // Add bus listener to be notified when a card is selected.
                // Selected cards are copied to the clipbaord, so the indication that
                // a card has been selected is something being copied to the clipboard
                addBusListener('board.clipboard', '$el.readyToLayout', function(e, $el) {
                    // A card has been selected or deselected. Process the selected cards.
                    this.processCardSelection($el);
                }.bind(this));

            },

            /*
             * Function to add the Points Selected indicator to the view.
             *
             * Parameters: None
             *
             * Returns: Nothing
             *
             * Only add it if it is not already there, otherwise we'll get multiple Points Selected
             * indicators when wee switch views.
             */
            renderPointTotalIndicator: function() {

                // This HTML for the indicator that needs to be inserted.
                var controlHTML = '<span class=\"tau-boardclipboard-title\" style=\"margin-left: 20px\">Selected points</span>' +
                    '<div id=\"points-selected-indicator\" class=\"tau-inline-group tau-selection-group\">' +
                    '<button id=\"pointsSelectedCounter\" class=\"tau-btn tau-btn-small\">0</button>' +
                    '</div>';

                // Add the indicator if one is not already there.  It needs to be inserted after the element
                // with the i-role-counter-block class.
                if ( $( "#points-selected-indicator" ).length === 0  ) {
                    $(controlHTML).insertAfter( ".i-role-counter-block" );
                }
            },

            /*
             * Function to process point totals for selected cards.
             *
             * Parameters: View element
             *
             * Returns: Nothing
             *
             * This function is called every every time a card is selected or deselected
             * Each time a new card is seleted, the point total for all selected cards is calculated.
             * Not the most efficient way to do it, but good enough for now.
             */
            processCardSelection: function($el) {

                var getSelectedCardIds = this.getSelectedCardIds.bind(this);
                var getTotalPoints = this.getTotalPoints.bind(this);
                _.forEach(nestedBoardsConfig, function(config, entityTypeName) {
                    // Check if cards are selected
                    var $cards = $el.find('.tau-card-v2_type_' + entityTypeName);

                    // Just for debugging
                    // notifyEvent('Cards Selected: ' + $cards.length);
                    // notifyEvent($cards);

                    // If we hve cards selected, get the ids.
                    if ($cards.length) {
                        var cardIDs = getSelectedCardIds();
                        notifyEvent('Card ID List: ' + cardIDs);
                        var pointsSelected = getTotalPoints(cardIDs);
                        notifyEvent('Total Points Selected: ' + pointsSelected);
                    } else {
                        notifyEvent('Last selected cards deselected.  No cards selected.');
                        // If we reach here, the last selected card has just been deselected
                        $('#pointsSelectedCounter').html('0');
                    }
                });
            },


            /*
             *  Function to get and return an array of ids of selected cards.
             *
             *  Parameters: None
             *
             *  Returns: cardIDs - an array containing the ids of selected cards
             *
             *  Gets its data from the Target Process' clipboard
             *
             */
            getSelectedCardIds: function() {

                var cardIDs = [];

                // When cards are selected, Target Process puts them in its clipboard
                var clipboardManager = appConfigurator.getClipboardManager();
                var acidStore = appConfigurator.getAppStateStore();

                acidStore.get({
                    fields: ['acid']
                }).then(function() {

                    var cards = _.values(clipboardManager._cache);

                    // item.data.id has the id of the selected card
                    cards.reduce(function(res, item) {

                        // Add the id of this card to the array
                        cardIDs.push(item.data.id);

                        // A bunch of stuff for debugging:
                        //notifyEvent('Selected Card item.data.id: ' + item.data.id);
                        //notifyEvent('item.data: ' + item.data.type);
                        //notifyEvent('Item: '+ Object.keys(item));
                        //notifyEvent('item.id: ' + item.id);
                        //notifyEvent('item._id: ' + item._id);
                        //notifyEvent('item.isSelected: ' + item.isSelected);

                        return res;
                    }, {});
                    notifyEvent('InsideCardIDs: ' + cardIDs);
                    return null;
                });

                return cardIDs;
            },

            /*
             * Function to get the effort data a set of cards and total it.
             *
             * Input: cardIDs:
             *
             * This has to be done though the REST API.
             */
            getTotalPoints: function(cardIDs) {
                var totalPoints = 0;
                notifyEvent('From getTotalPoints: ' + cardIDs);
                $.ajax({
                    type: 'get',
                    url: 'https://jqhealy.tpondemand.com/api/v1/UserStories',
                    data: {
                        format: 'json',
                        include: '[Effort]',
                        //where: '(UserStory.Id in [' + cardIDs + '])'
                        where: 'Id in (' + cardIDs + ')'
                    }
                }).then(function(data){

                    // Tally the points
                    // Need to figure out how to parse the data that comes back.
                    // foreach object
                    var totalEffort = 0;
                    for (var i = 0, len = data.Items.length; i < len; i++) {
                        totalEffort += data.Items[i].Effort;
                    }
                    //for each (var item in data.Items) {
                    //     totalEffort += item.Effort;
                    //}
                    //console.log("Got somethign ng back from API: " + data.Items[0].Effort); // array of UserStories
                    $('#pointsSelectedCounter').html(totalEffort);
                    console.log("Got somethign ng back from API: " + totalEffort); // array of UserStories
                });


                // totalPoints = 27;
                // Might need to return totalEffort instead.
                return totalPoints;
            }

        });

        return new Mashup();

    });
