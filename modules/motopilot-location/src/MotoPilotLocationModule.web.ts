import { registerWebModule, NativeModule } from 'expo';

class MotoPilotLocationModule extends NativeModule<{}> {}

export default registerWebModule(MotoPilotLocationModule, 'MotoPilotLocationModule');
