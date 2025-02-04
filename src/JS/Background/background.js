import getDarkModeStyles from "./getDarkModeStyles.js";
import saveData from "./dataHandler.js";

const messageTab = (sender, messageName, otherArguments) => {
  chrome.tabs.sendMessage(sender.tab.id, { ...otherArguments, message: messageName });
}

const getCurrentTab = async () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

const messageFunctions = {
  getDarkModeStyles: ({ sendResponse }) => {
    getDarkModeStyles().then((styles) => {
      sendResponse(styles);
    })
  },
  createNotification: ({ message, sender }) => {
    messageTab(sender, "createNotification", { html: message.html, isNode: message.isNode });
  },
  saveData: async ({ message, sendResponse }) => {
    const value = await saveData(message.action, message.key, message.value);
    sendResponse(value);
  },
  openPopup: () => {
    getCurrentTab().then((tab) => {
      chrome.action.getPopup({ tabId: tab.id }, (popup) => {
        if (popup) {
          chrome.action.openPopup();
        }
      });
    });
  },
  setTheme: ({ message, sender }) => {
    messageTab(sender, "setTheme", { isDarkMode: message.isDarkMode, inputState: message.inputState });
  }
};
const asyncMessageFunctions = [
  "saveData",
  "getDarkModeStyles"
];

const linkName = "classroom.google.com";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const messageFunction = messageFunctions[message.message];
  if (!messageFunction) {
    console.warn(`No handler for message: ${message.message}`);
    return;
  }

  messageFunction({ message, sender, sendResponse });
  if (asyncMessageFunctions.includes(message.message)) {
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url && tab.url.includes(linkName)) {
      chrome.action.enable(tabId);
    } else {
      chrome.action.disable(tabId);
    }
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && tab.url.includes(linkName)) {
      chrome.action.enable(activeInfo.tabId);
    } else {
      chrome.action.disable(activeInfo.tabId);
    }
  });
});

const updateIsFirstVisit = (tabCreated) => {
  chrome.tabs.query({}, (tabs) => {
    let count = tabs.filter(tab => tab.url && tab.url.includes(linkName)).length;

    let isFirstVisit;
    if (!tabCreated) {
      isFirstVisit = count == 0;
      if (isFirstVisit) {
        saveData("set", "isFirstVisit", true);
      }
    } else {
      isFirstVisit = count < 2;
      saveData("set", "isFirstVisit", isFirstVisit);
    }

  });
}

saveData("set", "isFirstVisit", true);
chrome.tabs.onCreated.addListener(() => {
  updateIsFirstVisit(true);
})

chrome.tabs.onRemoved.addListener(() => {
  updateIsFirstVisit(false);
});