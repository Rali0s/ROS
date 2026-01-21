import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { callGemini } from '../utils/gemini';

const RustGuideApp = () => {
  const [lesson, setLesson] = useState(0);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const lessons = [
    {
      title: "1. What is a Struct?",
      content: "A struct, or structure, is a custom data type that lets you name and package together multiple related values that make up a meaningful group.",
      code: `struct User {
    active: bool,
    username: String,
    email: String,
    sign_in_count: u64,
}`
    },
    {
      title: "2. Instantiating Structs",
      content: "To use a struct, we create an instance of that struct by specifying concrete values for each of the fields.",
      code: `let user1 = User {
    email: String::from("someone@example.com"),
    username: String::from("someusername123"),
    active: true,
    sign_in_count: 1,
};`
    },
    {
      title: "3. Tuple Structs",
      content: "Rust also supports tuple structs, which look similar to tuples but have a name for the struct itself.",
      code: `struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

let black = Color(0, 0, 0);
let origin = Point(0, 0, 0);`
    },
    {
      title: "4. Unit-Like Structs",
      content: "You can define structs without fields! These are called unit-like structs because they behave similarly to '()'. They are useful for implementing traits on types that don't need to store data.",
      code: `struct AlwaysEqual;

fn main() {
    let subject = AlwaysEqual;
    // Useful for traits like Debug or Default
}`
    },
    {
      title: "5. Method Syntax (impl)",
      content: "Methods are defined within the context of a struct (inside an 'impl' block). Their first parameter is always 'self', which represents the instance of the struct the method is called on.",
      code: `struct Rectangle { width: u32, height: u32 }

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }
}`
    },
    {
      title: "6. Associated Functions",
      content: "Functions inside 'impl' that don't take 'self' are called associated functions. They are often used as constructors, like 'String::from'.",
      code: `impl Rectangle {
    fn square(size: u32) -> Self {
        Self {
            width: size,
            height: size,
        }
    }
}
// Usage:
let sq = Rectangle::square(3);`
    },
    {
      title: "7. Structs & Ownership",
      content: "Structs own their data. If you want a struct to store references to data owned by something else, you need to use Lifetimes ('a) to ensure the data remains valid.",
      code: `struct User<'a> {
    username: &'a str, // Reference requiring lifetime
    active: bool,
}

fn main() {
    let name = String::from("User1");
    let u = User { username: &name, active: true };
}`
    }
  ];

  const handleDeepDive = async () => {
    setLoading(true);
    setAiExplanation(null);
    const current = lessons[lesson];
    const prompt = `Explain this Rust concept in depth for a beginner, but keep it concise (under 100 words). Concept: ${current.title}. Context: ${current.content}. Code: ${current.code}`;
    const response = await callGemini(prompt);
    setAiExplanation(response);
    setLoading(false);
  };

  // Reset explanation when lesson changes
  useEffect(() => {
    setAiExplanation(null);
  }, [lesson]);

  return (
    <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto text-slate-200">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-lime-500">Learning Rust: Structs</h2>
         <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-700">Interactive Mode</span>
      </div>

      <div className="flex space-x-2 border-b border-slate-600 pb-2 overflow-x-auto">
        {lessons.map((l, i) => (
          <button
            key={i}
            onClick={() => setLesson(i)}
            className={`px-3 py-1 whitespace-nowrap rounded text-sm transition ${lesson === i ? 'bg-lime-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            Part {i + 1}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">{lessons[lesson].title}</h3>
        <p className="text-slate-300 leading-relaxed">{lessons[lesson].content}</p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-700 font-mono text-sm text-blue-300 shadow-inner overflow-x-auto">
          <pre>{lessons[lesson].code}</pre>
        </div>
      </div>

      {/* AI Deep Dive Section */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        {!aiExplanation && !loading && (
          <button
            onClick={handleDeepDive}
            className="flex items-center gap-2 text-sm text-lime-400 hover:text-lime-300 transition"
          >
            <Sparkles size={16} />
            <span>Generate Deep Dive Explanation</span>
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400 animate-pulse">
            <Sparkles size={16} />
            <span>Generating explanation...</span>
          </div>
        )}

        {aiExplanation && (
          <div className="bg-slate-900/50 p-4 rounded border border-lime-500/30 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-lime-400 font-bold text-xs mb-2">
              <Sparkles size={12} /> AI DEEP DIVE
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {aiExplanation}
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 text-xs text-slate-500 italic">
        Tip: Structs are similar to classes in other languages, but without inheritance.
      </div>
    </div>
  );
};

export default RustGuideApp;