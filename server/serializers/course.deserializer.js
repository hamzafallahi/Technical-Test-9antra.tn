const CourseDeserializer = {
  deserialize: (data) => {
    if (data.data) {
      return CourseDeserializer.deserializeSingle(data.data);
    }
    return data;
  },

  deserializeSingle: (data) => {
    if (data.attributes) {
      return {
        ...data.attributes,
      };
    }
    return data;
  },
};

export default CourseDeserializer;
