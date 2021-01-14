# UseStore

A lib for create globa store and share data between page or component

## API

- `useStore<T>(storeKey: string, options?: Options<T>) => {get, set, getStore}`
- `useGlobalState<T>(key: string, options?: Options<T>) => {get, set}`

## Supported Config (On Going)

```
enum StoreType {
  runtime = 1,
  sessionStorage = 2,
  localStorage = 3,
}

type Options<T> = {
  type: StoreType;
  defaultValue: T;
  immutable: boolean;
};
```

## Example

```
import { useStore } from 'src/_shared/use-store';

type RootStore = {
  name: string;
  age: number;
  friends: Friend[];
};

const { get, set, getStore } = useStore<RootStore>(storeKeys.root);

set('name', 'Peter');
set('age', 28);
set('friends', []);

get('name');
...

```

## TS Support

![Alt Text](https://git.garena.com/evan.liu/user-store/-/raw/master/ts-restrain.gif)
