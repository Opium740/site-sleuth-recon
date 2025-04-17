
interface Chrome {
  tabs?: {
    query: (queryInfo: {active: boolean, currentWindow: boolean}, callback: (tabs: {url?: string}[]) => void) => void;
  };
  runtime?: {
    sendMessage: (message: any, callback: (response: any) => void) => void;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => void;
    };
  };
}

declare const chrome: Chrome;
