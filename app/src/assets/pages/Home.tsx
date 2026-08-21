import AppCard from "../components/AppCard";
import Card from "../components/Card";

function Home() {
  return (
    <>
      <main className="flex flex-col lg:grid lg:grid-cols-2 lg:gap-4 items-baseline justify-between p-4 w-full">
        <br className="lg:hidden" />
        <Card />
        <br className="lg:hidden" />
        <AppCard />
        <br className="lg:hidden" />
        <Card />
      </main>
    </>
  );
}

export default Home;
