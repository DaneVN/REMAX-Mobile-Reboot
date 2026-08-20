function navbar() {
  return (
    <nav>
      <ul className="flex space-x-4 justify-around bg-(--cl-base-dark) text-(--cl-white) p-4">
        <li className="active:text-(--cl-accent-dark) transition-colors duration-150">
          <a href="/">Home</a>
        </li>
        <li className="active:text-(--cl-accent-dark) transition-colors duration-150">
          <a href="/#apps">Apps</a>
        </li>
        <li className="active:text-(--cl-accent-dark) transition-colors duration-150">
          <a href="#crm">CRM</a>
        </li>
      </ul>
    </nav>
  );
}

export default navbar;
