sap.ui.define(['jquery.sap.global', 'sap/ui/core/mvc/Controller', 'sap/m/MessageToast'],
	function(jQuery, Controller, MessageToast) {
	"use strict";

	var PageController = Controller.extend("sap.m.sample.GenericTile1x1.Page", {
		press : function(evt) {
			MessageToast.show("The generic tile is pressed.");
		}
	});

	return PageController;
});