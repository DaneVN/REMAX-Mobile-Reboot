import AppCard from "../components/AppCard";
import Card from "../components/Card";

function Home() {
  return (
    <>
      <p className="text-lg text-(--cl-dark-blue) mb-4">
        This is the home page of the RE/MAX Unity Reboot application.
      </p>
      <br />
      <Card />
      <br />
      <AppCard />
      <br />
      <Card />
    </>
  );
}

export default Home;
