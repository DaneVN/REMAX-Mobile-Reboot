import AppCard from "../components/AppCard";
import Card from "../components/Card";

function Home() {
  return (
    <>
      <main className="flex flex-col items-center justify-between p-4">
        <p className="text-lg text-(--cl-dark-blue) mb-4">
          This is the home page of the RE/MAX Unity Reboot application.
        </p>
        <br />
        <Card />
        <br />
        <AppCard />
        <br />
        <Card />
      </main>
    </>
  );
}

export default Home;
