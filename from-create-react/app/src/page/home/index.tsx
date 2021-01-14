import React from "react";
import s from "./s.module.scss";
import { useStore } from "@share/hook/use-store";

function Home() {
  return (
    <div className="App">
      <header className={s.color}>Home</header>
    </div>
  );
}

export default Home;
