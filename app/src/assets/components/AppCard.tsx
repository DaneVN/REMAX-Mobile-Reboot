function AppCard() {
  return (
    <div
      id="apps"
      className="bg-(--cl-accent-dark) text-(--cl-white) p-4 rounded shadow-md w-full max-w-2xl"
    >
      <h2>App Card</h2>
      <p>App card content goes here.</p>
      <ul className="grid grid-cols-2 gap-2 mt-4 md:grid-cols-3 lg:grid-cols-4 place-self-center">
        {/* listed Icons that have btn functions attached */}
        <li className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex">
          App 1
        </li>
        <li className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex">
          App 2
        </li>
        <li className="bg-(--cl-accent) text-(--cl-white) p-2 rounded shadow-md w-45 max-w-2xl h-40 items-center justify-center flex">
          App 3
        </li>
      </ul>
    </div>
  );
}

export default AppCard;
