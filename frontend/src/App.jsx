import React, { useState, useEffect } from "react";

function App() {
  // New state variable for email
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [lifeExpectancy, setLifeExpectancy] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  // For weeks lived
  const [weeksLived, setWeeksLived] = useState(0);

  // Toggle whether to show numbers in each cell
  const [showNumbers, setShowNumbers] = useState(true);

  // For the countdown stats
  const [timeRemaining, setTimeRemaining] = useState({
    years: 0,
    months: 0,
    weeks: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Load stored data from localStorage (including email) on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("email");
    const savedDob = localStorage.getItem("dob");
    const savedLifeExpectancy = localStorage.getItem("lifeExpectancy");
    if (savedEmail && savedDob && savedLifeExpectancy) {
      setEmail(savedEmail);
      setDob(savedDob);
      setLifeExpectancy(savedLifeExpectancy);
      generateGridAndCountdown(savedDob, parseInt(savedLifeExpectancy, 10));
    }
  }, []);

  // Update countdown every second if data is loaded
  useEffect(() => {
    let timer;
    if (dataLoaded) {
      timer = setInterval(() => {
        updateCountdown(dob, parseInt(lifeExpectancy, 10));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [dataLoaded, dob, lifeExpectancy]);

  // Handler for "Generate" button
  const handleGenerate = async(e) => {
    e.preventDefault();
    if (!email || !dob || !lifeExpectancy) return;

    // Save email along with other data in localStorage
    localStorage.setItem("email", email);
    localStorage.setItem("dob", dob);
    localStorage.setItem("lifeExpectancy", lifeExpectancy);

    generateGridAndCountdown(dob, parseInt(lifeExpectancy, 10));
    try {
      const response = await fetch("https://time-canvas.vercel.app/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, dob, lifeExpectancy }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("User registered:", data);
      } else {
        console.error("Error:", data.error);
      }
    } catch (error) {
      console.error("Failed to connect to backend:", error);
    }
  };

  // Calculate weeks lived and update countdown
  const generateGridAndCountdown = (dobString, lifeExp) => {
    const birthDate = new Date(dobString);
    const now = new Date();

    // Calculate weeks since birth
    const diffInMs = now - birthDate;
    const weeksSinceBirth = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
    setWeeksLived(weeksSinceBirth);

    setDataLoaded(true);
    updateCountdown(dobString, lifeExp);
  };

  // Countdown calculations
  const updateCountdown = (dobString, lifeExp) => {
    const birthDate = new Date(dobString);
    const now = new Date();
    const finalDate = new Date(birthDate);
    finalDate.setFullYear(finalDate.getFullYear() + lifeExp);

    const diffInSeconds = Math.floor((finalDate - now) / 1000);
    if (diffInSeconds <= 0) {
      setTimeRemaining({
        years: 0,
        months: 0,
        weeks: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
      return;
    }

    const secondsInYear = 365.25 * 24 * 60 * 60;
    const secondsInMonth = 30.4375 * 24 * 60 * 60;
    const secondsInWeek = 7 * 24 * 60 * 60;
    const secondsInHour = 3600;
    const secondsInMinute = 60;

    let remainder = diffInSeconds;

    const years = Math.floor(remainder / secondsInYear);
    remainder -= years * secondsInYear;

    const months = Math.floor(remainder / secondsInMonth);
    remainder -= months * secondsInMonth;

    const weeks = Math.floor(remainder / secondsInWeek);
    remainder -= weeks * secondsInWeek;

    const hours = Math.floor(remainder / secondsInHour);
    remainder -= hours * secondsInHour;

    const minutes = Math.floor(remainder / secondsInMinute);
    remainder -= minutes * secondsInMinute;

    const seconds = remainder;

    setTimeRemaining({
      years,
      months,
      weeks,
      hours,
      minutes,
      seconds,
    });
  };

  // Reset function clears email as well
  const handleReset = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("dob");
    localStorage.removeItem("lifeExpectancy");
    setEmail("");
    setDob("");
    setLifeExpectancy("");
    setWeeksLived(0);
    setTimeRemaining({
      years: 0,
      months: 0,
      weeks: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
    setDataLoaded(false);
  };

  // Render the Life Calendar grid
  const renderGrid = () => {
    if (!dataLoaded) return null;
    const lifeExp = parseInt(lifeExpectancy, 10);
    const rows = [];
    for (let year = 0; year < lifeExp; year++) {
      rows.push(year);
    }
    const rowElements = rows.map((year) => {
      const cells = [];
      for (let week = 0; week < 52; week++) {
        const index = year * 52 + week;
        let cellColorClass = "bg-white";
        let textColorClass = "text-black";

        if (index < weeksLived) {
          cellColorClass = "bg-black";
          textColorClass = "text-white";
        } else if (index === weeksLived) {
          cellColorClass = "bg-yellow-400";
          textColorClass = "text-black";
        }

        const cellText = showNumbers ? index + 1 : "";
        cells.push(
          <div
            key={week}
            className={`flex items-center justify-center border border-gray-300 ${cellColorClass} ${textColorClass} w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-[8px] sm:text-xs md:text-sm font-medium`}
          >
            {cellText}
          </div>
        );
      }
      return (
        <div key={year} className="flex items-center gap-2">
          <div className="w-8 text-xs sm:text-sm text-gray-500 text-right">
            {year + 1}
          </div>
          <div className="grid grid-cols-52 gap-1">{cells}</div>
        </div>
      );
    });
    rowElements.reverse();
    return (
      <div className="bg-white shadow-md rounded p-4 w-full overflow-x-auto mt-4 print-container">
        <div className="flex flex-col gap-2">{rowElements}</div>
      </div>
    );
  };

  return (
    <>
      {/* Print CSS to force backgrounds and hide non-printable elements */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-container {
            display: block !important;
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        {!dataLoaded && (
          <form
            onSubmit={handleGenerate}
            className="bg-white shadow-md rounded p-6 w-full max-w-md text-center no-print"
          >
            <h1 className="text-2xl font-bold mb-6">Week of Your Life</h1>
            <div className="mb-4">
              <label className="block text-left mb-1 font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border rounded w-full p-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left mb-1 font-medium">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                className="border rounded w-full p-2"
              />
            </div>
            <div className="mb-4">
              <label className="block text-left mb-1 font-medium">
                Life Expectancy (years)
              </label>
              <input
                type="number"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(e.target.value)}
                required
                min="1"
                className="border rounded w-full p-2"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Generate
            </button>
          </form>
        )}

        {dataLoaded && (
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-center mb-4 no-print">
              Week of Your Life
            </h1>
            <div className="flex justify-center space-x-4 mb-4 no-print">
              <button
                onClick={() => setShowNumbers(!showNumbers)}
                className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
              >
                {showNumbers ? "Hide Numbers" : "Show Numbers"}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
              >
                Print
              </button>
            </div>
            {renderGrid()}
            <div className="bg-white shadow-md rounded p-4 w-full max-w-md mx-auto mt-6 no-print">
              <h3 className="text-xl font-bold mb-2 text-center">
                Time Remaining
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="text-right pr-2 font-medium">Years:</div>
                <div>{timeRemaining.years}</div>
                <div className="text-right pr-2 font-medium">Months:</div>
                <div>{timeRemaining.months}</div>
                <div className="text-right pr-2 font-medium">Weeks:</div>
                <div>{timeRemaining.weeks}</div>
                <div className="text-right pr-2 font-medium">Hours:</div>
                <div>{timeRemaining.hours}</div>
                <div className="text-right pr-2 font-medium">Minutes:</div>
                <div>{timeRemaining.minutes}</div>
                <div className="text-right pr-2 font-medium">Seconds:</div>
                <div>{timeRemaining.seconds}</div>
              </div>
              <button
                onClick={handleReset}
                className="mt-4 bg-red-500 text-white py-2 px-4 rounded w-full hover:bg-red-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
