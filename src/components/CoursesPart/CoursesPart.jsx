import React, { useState, useEffect } from "react";
import axios from "axios";

const CoursesPart = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get("http://localhost:3000/api/courses");
        setCourses(response.data); // Assuming response.data is an array of courses
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch courses. Please try again later.");
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Discover Our Courses</h2>
          <button className="text-pink-600 border border-pink-600 px-4 py-2 rounded-md hover:bg-pink-50">
            View More
          </button>
        </div>
        {loading ? (
          <div className="text-center">Loading courses...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ">
            {courses.map((course, index) => (
              <div
                key={index}
                className="overflow-hidden bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow "
              >
                <div className="relative h-48">
                  <img
                    src={`http://localhost:3000/uploads/${encodeURIComponent(course.imageUrl)}`}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform hover:scale-105"
                  />
                  <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow">
                    {course.icon}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                  <p className="mt-2 text-pink-600 font-medium">{course.price} DT / Month</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CoursesPart;
