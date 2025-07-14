const deserializeMiddleware = (Deserializer) => {
  return (req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
      req.body = Deserializer.deserialize(req.body);
    }
    next();
  };
};

export default deserializeMiddleware;
