(function() {
  //we'll need the getBoundingClientRect function for the
  //hash scripting, so if it's not supported just return,
  //then the elements will remain in their default open state
  if (
    typeof document.createElement("span").getBoundingClientRect == "undefined"
  ) {
    return;
  }

  //add event construct for modern browsers or IE
  //which fires the callback with a pre-converted target reference
  function addEvent(node, type, callback) {
    if (node.addEventListener) {
      node.addEventListener(
        type,
        function(e) {
          callback(e, e.target);
        },
        false
      );
    } else if (node.attachEvent) {
      node.attachEvent("on" + type, function(e) {
        callback(e, e.srcElement);
      });
    }
  }

  //handle cross-modal click events
  function addClickEvent(node, callback) {
    var keydown = false;
    addEvent(node, "keydown", function() {
      keydown = true;
    });
    addEvent(node, "keyup", function(e, target) {
      keydown = false;
      if (e.keyCode == 13) {
        callback(e, target);
      }
    });
    addEvent(node, "click", function(e, target) {
      if (!keydown) {
        callback(e, target);
      }
    });
  }

  //get the nearest ancestor element of a node that matches a given tag name
  function getAncestor(node, match) {
    do {
      if (!node || node.nodeName.toLowerCase() == match) {
        break;
      }
    } while ((node = node.parentNode));

    return node;
  }

  //create a started flag so we can prevent the initialisation
  //function firing from both DOMContentLoaded and window.onloiad
  var started = false;

  //initialisation function
  function addDetailsOmnifill(list) {
    //if this has already happened, just return
    //else set the flag so it doesn't happen again
    if (started) {
      return;
    }
    started = true;

    //get the collection of details elements, but if that's empty
    //then we don't need to bother with the rest of the scripting
    if ((list = document.getElementsByTagName("details")).length == 0) {
      return;
    }

    //else iterate through them to apply their initial state
    for (var n = list.length, i = 0; i < n; i++) {
      var details = list[i];

      //detect native implementations
      details.__native = typeof details.open == "boolean";

      //save shortcuts to the inner summary and content elements
      details.__summary = details.getElementsByTagName("summary").item(0);
      details.__content = details.getElementsByTagName("div").item(0);

      //if the content doesn't have an ID, assign it one now
      //which we'll need for the summary's aria-controls assignment
      if (!details.__content.id) {
        details.__content.id = "details-content-" + i;
      }

      //then define aria-controls on the summary to point to that ID
      //so that assistive technologies know it controls the aria-expanded state
      details.__summary.setAttribute("aria-controls", details.__content.id);

      //also set tabindex so the summary is keyboard accessible
      details.__summary.setAttribute("tabindex", "0");

      //then set aria-expanded and style.display and remove the
      //open attribute, so this region is now collapsed by default
      details.__content.setAttribute("aria-expanded", "false");
      details.__content.style.display = "none";
      details.removeAttribute("open");

      //create a circular reference from the summary back to its
      //parent details element, for convenience in the click handler
      details.__summary.__details = details;

      //then if this is not a native implementation, create a twisty
      //inside the summary, saving its reference as a summary property
      if (!details.__native) {
        var twisty = document.createElement("span");
        twisty.className = "twisty";
        twisty.appendChild(document.createTextNode("\u25ba"));

        details.__summary.__twisty = details.__summary.insertBefore(
          twisty,
          details.__summary.firstChild
        );
      }
    }

    //define a statechange function that updates aria-expanded and style.display
    //to either expand or collapse the region (ie. invert the current state)
    //or to set a specific state if the expanded flag is strictly true or false
    //then update the twisty if we have one with a correpsonding glyph
    function statechange(summary, expanded) {
      if (typeof expanded == "undefined") {
        expanded =
          summary.__details.__content.getAttribute("aria-expanded") == "true";
      } else if (expanded === false) {
        summary.__details.setAttribute("open", "open");
      } else if (expanded === true) {
        summary.__details.removeAttribute("open");
      }

      summary.__details.__content.setAttribute(
        "aria-expanded",
        expanded ? "false" : "true"
      );
      summary.__details.__content.style.display = expanded ? "none" : "block";

      if (summary.__twisty) {
        summary.__twisty.firstChild.nodeValue = expanded ? "\u25ba" : "\u25bc";
      }

      return true;
    }

    //now bind a document click event to handle summary elements
    //if the target is not inside a summary element, just return true
    //to pass-through the event, else call and return the statechange function
    //which also returns true to pass-through the remaining event
    addClickEvent(document, function(e, summary) {
      if (!(summary = getAncestor(summary, "summary"))) {
        return true;
      }
      return statechange(summary);
    });

    //define an autostate function that identifies whether a target
    //is or is inside a details region, and if so expand that region
    //then iterate up the DOM expanding any ancestors, then finally
    //return the original target if applicable, or null if not
    function autostate(target, expanded, ancestor) {
      if (typeof ancestor == "undefined") {
        if (!(target = getAncestor(target, "details"))) {
          return null;
        }
        ancestor = target;
      } else {
        if (!(ancestor = getAncestor(ancestor, "details"))) {
          return target;
        }
      }

      statechange(ancestor.__summary, expanded);

      return autostate(target, expanded, ancestor.parentNode);
    }

    //then if we have a location hash, call the autostate
    //function now with the target element it refers to
    if (location.hash) {
      autostate(document.getElementById(location.hash.substr(1)), false);
    }

    //then bind a document click event to handle internal page links
    //ignoring links to other pages, else passing the target it
    //refers to to the autostate function, and if that returns a target
    //auto-scroll the page so that the browser jumps to that target
    //then return true anyway so that the address-bar hash updates
    addEvent(document, "click", function(e, target) {
      if (!target.href) {
        return true;
      }
      if ((target = target.href.split("#")).length == 1) {
        return true;
      }
      if (document.location.href.split("#")[0] != target[0]) {
        return true;
      }
      if ((target = autostate(document.getElementById(target[1]), false))) {
        window.scrollBy(0, target.getBoundingClientRect().top);
      }
      return true;
    });
  }

  //then bind two load events for modern and older browsers
  //if the first one fires it will set a flag to block the second one
  //but if it's not supported then the second one will fire
  addEvent(document, "DOMContentLoaded", addDetailsOmnifill);
  addEvent(window, "load", addDetailsOmnifill);
})();
