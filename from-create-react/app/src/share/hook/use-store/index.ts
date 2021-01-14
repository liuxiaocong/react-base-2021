import { useEffect, useState, useCallback } from "react";

export enum StoreType {
  runtime = 1,
  sessionStorage = 2,
  localStorage = 3,
}

type Options<T> = {
  type?: StoreType;
  defaultValue?: T;
  immutable?: boolean;
};

type CallbackFunction = (value: any, subKey?: string) => void;

const DEFAULT_KEY = "__DEFAULT_@KEY__";
/**
 * Simple way to handle string store with different type value like number, boolean
 * or array and object, if value is not object, wrap and take as object with specail key
 */
const SP_KEY = "__SP_@KEY__"; // special key for keep alive unobject value as key-value object

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadValueFromSessionStorage = <T extends any>(
  key: string
): T | undefined => {
  const eventScope = `store@${key}`;
  const value = sessionStorage.getItem(eventScope);
  if (value) {
    try {
      const jsonValue = JSON.parse(value);
      if (jsonValue[SP_KEY]) {
        return jsonValue[SP_KEY];
      }
      return jsonValue;
    } catch (e) {}
  }
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const saveValueToSessionStorage = <T extends any>(
  key: string,
  value: T
): void => {
  const eventScope = `store@${key}`;
  let valueToSet: string | T = value;
  if (typeof valueToSet === "object") {
    valueToSet = JSON.stringify(value);
  } else {
    const data: Record<string, unknown> = {};
    data[SP_KEY] = value;
    valueToSet = JSON.stringify(data);
  }
  try {
    sessionStorage.setItem(eventScope, valueToSet);
  } catch (e) {}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadValueFromLocalStorage = <T extends any>(
  key: string
): T | undefined => {
  const eventScope = `store@${key}`;
  const value = localStorage.getItem(eventScope);
  if (value) {
    try {
      const jsonValue = JSON.parse(value);
      if (jsonValue[SP_KEY]) {
        return jsonValue[SP_KEY];
      }
      return jsonValue;
    } catch (e) {}
  }
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const saveValueToLocalStorage = <T extends any>(
  key: string,
  value: T
): void => {
  const eventScope = `store@${key}`;
  let valueToSet: string | T = value;
  if (typeof valueToSet === "object") {
    valueToSet = JSON.stringify(value);
  } else {
    const data: Record<string, unknown> = {};
    data[SP_KEY] = value;
    valueToSet = JSON.stringify(data);
  }
  try {
    localStorage.setItem(eventScope, valueToSet);
  } catch (e) {}
};

// global data storage
const global: {
  [key: string]: any;
} = {};
global[DEFAULT_KEY] = {};

// hook for component set state functions
const subscribeQueue: {
  [key: string]: CallbackFunction[];
} = {};

// invoking hook functions by key
const notify = (key: string, subKey?: string): void => {
  const queue = subscribeQueue[key];
  queue.forEach((fn: CallbackFunction) => {
    subKey && global[key] ? fn(global[key][subKey], subKey) : fn(global[key]);
  });
};

const getLive = <T extends any>(storeKey: string, type?: StoreType): T => {
  if (global[storeKey]) {
    return global[storeKey];
  } else {
    if (type === StoreType.sessionStorage) {
      global[storeKey] = loadValueFromSessionStorage(storeKey);
    }
    if (type === StoreType.localStorage) {
      global[storeKey] = loadValueFromLocalStorage(storeKey);
    }
  }
  return global[storeKey];
};

const getDefaultLiveValue = <T extends any>(
  key: string,
  type?: StoreType
): T => {
  if (global[DEFAULT_KEY][key]) {
    return global[DEFAULT_KEY][key];
  } else {
    const liveStoreKey = DEFAULT_KEY + "@" + key;
    if (type === StoreType.sessionStorage) {
      global[DEFAULT_KEY][key] = loadValueFromSessionStorage(liveStoreKey);
    }
    if (type === StoreType.localStorage) {
      global[DEFAULT_KEY][key] = loadValueFromLocalStorage(liveStoreKey);
    }
  }
  return global[DEFAULT_KEY][key];
};

// use custom store
const useStore = <T extends Record<string, unknown>>(
  storeKey: string,
  options?: Options<T>
): {
  getStore: () => T;
  get: <K extends keyof T>(key: K) => T[K];
  set: <K extends keyof T>(key: K, val: T[K]) => void;
} => {
  const [data, setData] = useState<T | undefined>(
    getLive<T>(storeKey, options?.type)
  );
  const [, forceUpdate] = useState<any>();

  const setStore = useCallback(
    (storeData: T) => {
      setData(storeData);
      forceUpdate({});
    },
    [storeKey]
  );

  useEffect(() => {
    if (!subscribeQueue[storeKey]) {
      subscribeQueue[storeKey] = [];
    }
    subscribeQueue[storeKey].push(setStore);
    return (): void => {
      const target = subscribeQueue[storeKey].indexOf(setStore);
      subscribeQueue[storeKey].splice(target, 1);
    };
  }, []);

  const set = <K extends keyof T>(key: K, val: T[K]): void => {
    if (!global[storeKey]) {
      global[storeKey] = {};
    }
    global[storeKey][key + ""] = val;
    setData(global[storeKey]);
    if (options) {
      options.type === StoreType.sessionStorage &&
        saveValueToSessionStorage(storeKey, global[storeKey]);
      options.type === StoreType.localStorage &&
        saveValueToLocalStorage(storeKey, global[storeKey]);
    }
    forceUpdate({});
    notify(storeKey);
  };

  const get = (key: keyof T): any => {
    return data ? data[key] : undefined;
  };

  const getStore = () => {
    return global[storeKey];
  };
  return { get, set, getStore };
};

// use default store
const useGlobalState = <U>(
  key: string,
  options?: Options<U>
): {
  get: () => U;
  set: (val: U) => void;
} => {
  const [data, setData] = useState<U>(
    getDefaultLiveValue<U>(key, options?.type)
  );

  const get = (): any => {
    return data;
  };

  const set = (val: U): void => {
    const liveStoreKey = DEFAULT_KEY + "@" + key;
    global[DEFAULT_KEY][key] = val;
    setData(val);
    if (options) {
      options.type === StoreType.sessionStorage &&
        saveValueToSessionStorage(liveStoreKey, val);
      options.type === StoreType.localStorage &&
        saveValueToLocalStorage(liveStoreKey, val);
    }
    notify(DEFAULT_KEY, key);
  };

  const setByKey = (val: U, subKey: string): void => {
    if (key === subKey) {
      setData(val);
    }
  };

  useEffect(() => {
    if (!subscribeQueue[DEFAULT_KEY]) {
      subscribeQueue[DEFAULT_KEY] = [];
    }
    subscribeQueue[DEFAULT_KEY].push(setByKey);
    return (): void => {
      const target = subscribeQueue[DEFAULT_KEY].indexOf(setByKey);
      subscribeQueue[DEFAULT_KEY].splice(target, 1);
    };
  }, []);

  return { get, set };
};
export { useStore, useGlobalState };
