import app from './app';
import { env } from './utils/env';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});
