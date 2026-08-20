import CalculatorCard from "../components/Calculator/CalculatorCard";

function Calculator() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4 text-(--cl-base-dark)">
        Commission Calculator
      </h1>
      <CalculatorCard />
    </div>
  );
}

export default Calculator;
