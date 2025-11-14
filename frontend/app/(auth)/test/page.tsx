'use client'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-white p-8 space-y-8">
      <h1 className="text-2xl font-bold">SVG Debug Test</h1>

      {/* Test 1: White SVG - should be white */}
      <div>
        <h2 className="text-lg font-bold mb-4">Test 1: White SVG (Direct)</h2>
        <div className="bg-black p-8">
          <img src="/assets/previa/whiteprevia.svg" alt="white" className="w-48 h-auto" />
        </div>
      </div>

      {/* Test 2: Black SVG - should be black */}
      <div>
        <h2 className="text-lg font-bold mb-4">Test 2: Black SVG (Direct)</h2>
        <div className="bg-white p-8 border">
          <img src="/assets/previa/blackprevia.svg" alt="black" className="w-48 h-auto" />
        </div>
      </div>

      {/* Test 3: White SVG with opacity */}
      <div>
        <h2 className="text-lg font-bold mb-4">Test 3: White SVG with Opacity</h2>
        <div className="bg-black p-8">
          <img src="/assets/previa/whiteprevia.svg" alt="white" className="w-48 h-auto opacity-[0.3]" />
        </div>
      </div>

      {/* Test 4: Black SVG with opacity */}
      <div>
        <h2 className="text-lg font-bold mb-4">Test 4: Black SVG with Opacity</h2>
        <div className="bg-white p-8 border">
          <img src="/assets/previa/blackprevia.svg" alt="black" className="w-48 h-auto opacity-[0.3]" />
        </div>
      </div>

      {/* Test 5: Inline SVG - white content */}
      <div>
        <h2 className="text-lg font-bold mb-4">Test 5: Inline SVG (White fill)</h2>
        <div className="bg-black p-8">
          <svg width="200" height="120" viewBox="0 0 441 263" xmlns="http://www.w3.org/2000/svg">
            <path fill="#ffffff" d="M206.988 12.1093C235.831 10.3039 264.283 19.5254 286.584 37.907L206.988 12.1093Z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

