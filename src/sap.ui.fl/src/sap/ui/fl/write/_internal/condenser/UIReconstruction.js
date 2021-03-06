/*!
 * ${copyright}
 */

/* global Map */
sap.ui.define([
	"sap/ui/fl/write/_internal/condenser/classifications/Create",
	"sap/ui/fl/write/_internal/condenser/classifications/Destroy",
	"sap/ui/fl/write/_internal/condenser/classifications/Move",
	"sap/ui/fl/write/_internal/condenser/Utils"
], function(
	Create,
	Destroy,
	Move,
	CondenserUtils
) {
	"use strict";

	/**
	 * Handles the UI Reconstruction for the Condenser
	 *
	 * @namespace
	 * @alias sap.ui.fl.write._internal.condenser.UIReconstruction
	 * @author SAP SE
	 * @version ${version}
	 */
	var UIReconstruction = {};

	var TARGET_UI = CondenserUtils.TARGET_UI;
	var INITIAL_UI = CondenserUtils.INITIAL_UI;
	var PLACEHOLDER = CondenserUtils.PLACEHOLDER;
	var INDEX_RELATED = {
		create: Create,
		destroy: Destroy,
		move: Move
	};

	function forEveryMapInMap(mMap, fnCallback) {
		mMap.forEach(function(mOuterMap, sOuterKey) {
			mOuterMap.forEach(function(mInnerMap, sInnerKey) {
				fnCallback(mOuterMap, sOuterKey, mInnerMap, sInnerKey);
			});
		});
	}

	/**
	 * Shifts an element from an old index to a new one within the array of elements.
	 *
	 * @param {string[]} aElements - Array of elements
	 * @param {int} iOldIndex - Old index of the element
	 * @param {int} iNewIndex - New index of the element
	 */
	function shiftElement(aElements, iOldIndex, iNewIndex) {
		aElements.splice(iNewIndex, 0, aElements.splice(iOldIndex, 1)[0]);
	}

	/**
	 * Defines the data structures that contain a container with an array of condenser info objects.
	 *
	 * @param {Map} mUIReconstructions - Map of UI reconstructions that holds key-value pairs. A key is a selector ID of the container. A value is a nested map which contains initial and target UI reconstructions
	 * @param  {object[]} aCondenserInfos - Array of condenser info objects
	 * @returns {Map} Simulation of the UI reconstruction
	 */
	function defineContainersMap(mUIReconstructions, aCondenserInfos) {
		var mContainers = new Map();
		forEveryMapInMap(mUIReconstructions, function(mUIState, sContainerKey, mUIAggregationState, sAggregationName) {
			var aTargetElementIds = mUIAggregationState.get(TARGET_UI);

			aTargetElementIds.forEach(function(sTargetElementId) {
				aCondenserInfos.forEach(function(oCondenserInfo) {
					if (sTargetElementId === oCondenserInfo.affectedControl) {
						if (!mContainers.has(sContainerKey)) {
							mContainers.set(sContainerKey, new Map());
						}
						var mAggregations = mContainers.get(sContainerKey);
						if (!mAggregations.has(sAggregationName)) {
							mAggregations.set(sAggregationName, []);
						}
						var aContainerElements = mAggregations.get(sAggregationName);
						aContainerElements.push(oCondenserInfo);
					}
				});
			});
		});
		return mContainers;
	}

	/**
	 * Verifies whether the array of changes contains only changes of type 'add'.
	 *
	 * @param {object[]} aCondenserInfos - Array of condenser info objects
	 * @returns {boolean} <code>true</code> if the array of condenser info objects contains only changes of type 'add'
	 */
	function containsOnlyAddChanges(aCondenserInfos) {
		return !aCondenserInfos.some(function(vElement) {
			return vElement.subtype.indexOf(sap.ui.fl.condenser.ClassificationSubtypes.Create) !== 0;
		});
	}

	/**
	 * Verifies whether the array of elements contains no unknown elements.
	 *
	 * @param {string[]} aElements - Array of elements
	 * @returns {boolean} <code>true</code> if the array of elements contains no unknown elements
	 */
	function containsNoPlaceholder(aElements) {
		return !aElements.some(function(vElement) {
			return CondenserUtils.isUnknown(vElement);
		});
	}

	/**
	 * Retrieves the target index of the index-related change.
	 *
	 * @param {object} oCondenserInfo - Change instance
	 * @returns {int} Target index of the index-related change
	 */
	function getTargetIndex(oCondenserInfo) {
		return oCondenserInfo.getTargetIndex(oCondenserInfo.change);
	}

	/**
	 * Sort the array of changes in the ascending order.
	 *
	 * @param {object[]} aCondenserInfos - Array of condenser info objects
	 */
	function sortAscendingByTargetIndex(aCondenserInfos) {
		aCondenserInfos.sort(function(a, b) {
			var iCurrentTargetIndex = getTargetIndex(a);
			var iNextTargetIndex = getTargetIndex(b);
			return iCurrentTargetIndex - iNextTargetIndex;
		});
	}

	/**
	 * Verifies whether the array of elements contains any unknown elements.
	 *
	 * @param {string[]} aElements - Array of elements
	 * @returns {boolean} <code>true</code> if the array of elements contains an unknown element
	 */
	function containsOnlyPlaceholder(aElements) {
		return !aElements.some(function(vElement) {
			return !CondenserUtils.isUnknown(vElement);
		});
	}

	/**
	 * Shifts the index-related change from the source index to the target index.
	 *
	 * @param {Map} mUIReconstructions - Map of UI reconstructions that holds key-value pairs. A key is a selector ID of the container. A value is a nested map which contains initial and target UI reconstructions
	 * @param {Object} oCondenserInfo - Instance of condenser info object
	 */
	function shiftToTargetIndex(mUIReconstructions, oCondenserInfo) {
		var sContainerKey = oCondenserInfo.targetContainer;
		var sAffectedControlId = oCondenserInfo.affectedControl;
		var iTargetIndex = oCondenserInfo.getTargetIndex(oCondenserInfo.change);
		var aContainerElements = mUIReconstructions.get(sContainerKey).get(oCondenserInfo.targetAggregation);
		CondenserUtils.extendArrayWithPlaceholders(aContainerElements, undefined, iTargetIndex);
		var iSourceIndex = aContainerElements.indexOf(sAffectedControlId);
		shiftElement(aContainerElements, iSourceIndex, iTargetIndex);
	}

	/**
	 * Verifies whether the passed arrays are equal.
	 *
	 * @param {string[]} a - The first passed arrays of values
	 * @param {string[]} b - The second passed arrays of values
	 * @returns {boolean} <code>true</code> if the passed arrays are equal
	 */
	function isEqual(a, b) {
		var c;
		if (a.length < b.length) {
			c = b.slice(a.length);
			if (!containsOnlyPlaceholder(c)) {
				return false;
			}
			b = b.slice(0, a.length);
		} else if (a.length > b.length) {
			c = a.slice(b.length, a.length);
			if (!containsOnlyPlaceholder(c)) {
				return false;
			}
			a = a.slice(0, b.length);
		}
		return !a.some(function(vElement, iIndex) {
			return vElement !== b[iIndex];
		});
	}

	/**
	 * Simulates the set of changes and checks if the simulation is equal to the target state
	 *
	 * @param {string} sContainerKey - Selector ID of the container
	 * @param {string} sAggregationName - Name of the aggregation
	 * @param {string[]} aInitialUIElementIds - Array of the initial UI element IDs
	 * @param {string[]} aTargetUIElementIds - Array of the target UI element IDs
	 * @param {object[]} aCondenserInfos - Array of condenser info objects
	 * @returns {boolean} <code>true</code> if the simulated and the target UI reconstructions are equal
	 */
	function isEqualReconstructedUI(sContainerKey, sAggregationName, aInitialUIElementIds, aTargetUIElementIds, aCondenserInfos) {
		var mUISimulatedStates = new Map();

		aCondenserInfos.forEach(function(oCondenserInfo) {
			var sContainerKey = oCondenserInfo.targetContainer;
			if (!mUISimulatedStates.has(sContainerKey)) {
				mUISimulatedStates.set(sContainerKey, new Map());
			}
			var mUIAggregationState = mUISimulatedStates.get(sContainerKey);
			if (!mUIAggregationState.get(sAggregationName)) {
				mUIAggregationState.set(sAggregationName, CondenserUtils.initializeArrayWithPlaceholders(0, aInitialUIElementIds.length - 1));
			}

			INDEX_RELATED[oCondenserInfo.subtype].simulate(mUIAggregationState.get(sAggregationName), oCondenserInfo, aInitialUIElementIds);
		});

		aCondenserInfos.forEach(function(oCondenserInfo) {
			if (oCondenserInfo.subtype === sap.ui.fl.condenser.ClassificationSubtypes.Move) {
				shiftToTargetIndex(mUISimulatedStates, oCondenserInfo);
			}
		});

		var aSortedUIElementIds = mUISimulatedStates.get(sContainerKey).get(sAggregationName);
		if (isEqual(aTargetUIElementIds, aSortedUIElementIds)) {
			return true;
		}
		return false;
	}

	/**
	 * Updates the target index of the index-related changes.
	 *
	 * @param {Map} mReducedChanges - Map of reduced changes
	 * @param {Map} mUIReconstructions - Map of UI reconstructions
	 */
	function updateTargetIndex(mReducedChanges, mUIReconstructions) {
		forEveryMapInMap(mUIReconstructions, function(mUIStates, sContainerId, mUIAggregationState) {
			mUIAggregationState.get(TARGET_UI).forEach(function(sTargetElementId, iIndex) {
				if (!CondenserUtils.isUnknown(sTargetElementId)) {
					var mClassificationTypes = mReducedChanges.get(sTargetElementId);
					var mSubtypes = mClassificationTypes.get(sap.ui.fl.condenser.ClassificationType.IndexRelated);
					mSubtypes.forEach(function(aCondenserChanges, sSubtypeKey) {
						if (sSubtypeKey !== sap.ui.fl.condenser.ClassificationSubtypes.Destroy) {
							aCondenserChanges.forEach(function(oCondenserChange) {
								oCondenserChange.setTargetIndex(oCondenserChange.change, iIndex);
							});
						}
					});
				}
			});
		});
	}

	/**
	 * Compares the initial and target UI reconstructions of the corresponding container.
	 * If the UI reconstructions are equal, the corresponding index-related changes will be removed from the data structure with the reduced changes.
	 *
	 * @param {Map} mReducedChanges - Map of reduced changes
	 * @param {Map} mUIReconstructions - Map of UI reconstructions
	 */
	function compareUIReconstructions(mReducedChanges, mUIReconstructions) {
		forEveryMapInMap(mUIReconstructions, function(mUIStates, sContainerId, mUIAggregationState, sKey) {
			var aInitialElementIds = mUIAggregationState.get(INITIAL_UI);
			var aTargetElementIds = mUIAggregationState.get(TARGET_UI);
			if (isEqual(aInitialElementIds, aTargetElementIds)) {
				aTargetElementIds.forEach(function(sTargetElementId) {
					var mClassificationTypes = mReducedChanges.get(sTargetElementId);
					if (mClassificationTypes !== undefined) {
						mClassificationTypes.delete(sap.ui.fl.condenser.ClassificationType.IndexRelated);
					}
				});
				mUIStates.delete(sKey);
			}
		});
	}

	/**
	 * Iterates through the array of the initial UI element IDs and verifies whether element ID was not affected.
	 * If this is the case, the corresponding element ID will be replaced through the placeholder with its initial index.
	 *
	 * @param {Map} mReducedChanges - Map of reduced changes
	 * @param {Map} mUIReconstructions - Map of UI reconstructions
	 */
	function updateTargetUIReconstructions(mReducedChanges, mUIReconstructions) {
		forEveryMapInMap(mUIReconstructions, function(mUIStates, sContainerId, mUIAggregationState) {
			var aInitialElementIds = mUIAggregationState.get(INITIAL_UI);
			var aTargetElementIds = mUIAggregationState.get(TARGET_UI);
			aInitialElementIds.forEach(function(initialElementId, index) {
				var mClassificationTypes = mReducedChanges.get(initialElementId);
				if (mClassificationTypes === undefined) {
					var sPlaceholder = PLACEHOLDER + index;
					var iTargetIndex = aTargetElementIds.indexOf(initialElementId);
					if (iTargetIndex >= 0) {
						aTargetElementIds[iTargetIndex] = sPlaceholder;
					}
				}
			});
		});
	}

	/**
	 * Sorts the index relevant changes in the list of all reduced changes.
	 * The index relevant changes are already in order, this order has to be taken over to the other list.
	 *
	 * @param {sap.ui.fl.Change[]} aSortedIndexRelatedChanges - Array of sorted reduced index related changes
	 * @param {sap.ui.fl.Change[]} aAllReducedChanges - Array of all reduced changes
	 */
	UIReconstruction.swapChanges = function(aSortedIndexRelatedChanges, aAllReducedChanges) {
		var aIndexes = aSortedIndexRelatedChanges.map(function(oChange) {
			return aAllReducedChanges.indexOf(oChange);
		}).sort();
		aSortedIndexRelatedChanges.forEach(function(oChange) {
			aAllReducedChanges[aIndexes.shift()] = oChange;
		});
	};

	/**
	 * Sorts the index-related changes until the look and feel of the UI fits the target UI reconstruction.
	 *
	 * @param {Map} mUIReconstructions - Map of UI reconstructions
	 * @param {object[]} aCondenserInfos - Array of condenser info objects
	 * @returns {sap.ui.fl.Change[]} Sorted array of index-related changes
	 */
	UIReconstruction.sortIndexRelatedChanges = function(mUIReconstructions, aCondenserInfos) {
		var aSortedIndexRelatedChanges = [];
		var mContainers = defineContainersMap(mUIReconstructions, aCondenserInfos);

		forEveryMapInMap(mContainers, function(mAggregations, sContainerKey, aCondenserInfos, sAggregationName) {
			var aTargetElementIds = mUIReconstructions.get(sContainerKey).get(sAggregationName).get(TARGET_UI);
			var aInitialElementIds = mUIReconstructions.get(sContainerKey).get(sAggregationName).get(INITIAL_UI);

			// Verify whether the algorithm should be ready before ;)
			if (
				containsNoPlaceholder(aTargetElementIds)
				|| containsOnlyAddChanges(aCondenserInfos)
			) {
				sortAscendingByTargetIndex(aCondenserInfos);
			} else if (!isEqualReconstructedUI(sContainerKey, sAggregationName, aInitialElementIds, aTargetElementIds, aCondenserInfos)) {
				var abort = false;
				var iTimes = aCondenserInfos.length;
				while (iTimes !== 0 && !abort) {
					var iOldIndex = 0;
					var iNewIndex = 1;
					// implement intelligent / efficient sorting  -> smart sort
					while (iNewIndex < aCondenserInfos.length && !abort) {
						shiftElement(aCondenserInfos, iOldIndex, iNewIndex);
						abort = isEqualReconstructedUI(sContainerKey, sAggregationName, aInitialElementIds, aTargetElementIds, aCondenserInfos);
						iOldIndex++;
						iNewIndex++;
					}
					iTimes--;
				}
			}
			aCondenserInfos.forEach(function(oCondenserInfo) {
				aSortedIndexRelatedChanges = aSortedIndexRelatedChanges.concat(oCondenserInfo.change);
			});
		});

		return aSortedIndexRelatedChanges;
	};

	UIReconstruction.addChange = function(mUIReconstructions, oCondenserInfo) {
		INDEX_RELATED[oCondenserInfo.subtype].addToReconstructionMap(mUIReconstructions, oCondenserInfo);
	};

	UIReconstruction.compareAndUpdate = function(mReducedChanges, mUIReconstructions) {
		compareUIReconstructions(mReducedChanges, mUIReconstructions);
		updateTargetUIReconstructions(mReducedChanges, mUIReconstructions);
		updateTargetIndex(mReducedChanges, mUIReconstructions);
	};

	return UIReconstruction;
});