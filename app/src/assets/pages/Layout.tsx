import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Navbar from "../components/Navbar";

const Layout = () => {
  return (
    <>
      <Header />
      <Navbar />
      <br />
      <main className="flex flex-col items-center justify-between p-4">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
