import React, { useState } from "react";
import axios from "axios";

const Footer = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    console.log(formData);

    try {
      const response = await axios.post("http://localhost:3000/api/contactus", formData);
      if (response.status === 201) {
        setStatus("Message sent successfully!");
        setFormData({ name: "", email: "", message: "" });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setStatus("Failed to send the message. Please try again later.");
    }
  };

  return (
    <section className="py-16 bg-orange-100">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Contact Us
          </h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Name"
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full p-3 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Message"
                className="w-full p-3 border border-gray-300 rounded-md min-h-[100px]"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-md"
            >
              Send the message
            </button>
          </form>
          {status && <p className="text-center mt-4 text-gray-700">{status}</p>}
        </div>
      </div>
    </section>
  );
};

export default Footer;
