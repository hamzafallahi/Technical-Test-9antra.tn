const CourseSerializer = {
  serialize: (data) => {
    if (Array.isArray(data)) {
      return {
        data: data.map((course) => CourseSerializer.serializeSingle(course)),
      };
    }
    return {
      data: CourseSerializer.serializeSingle(data),
    };
  },

  serializeSingle: (course) => {
    if (!course) return null;
    
    const serialized = {
      type: "courses",
      id: course.id,
      attributes: {
        title: course.title,
        description: course.description,
        price: parseFloat(course.price),
        imageUrl: course.imageUrl,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
    };

    return serialized;
  },
};

export default CourseSerializer;
