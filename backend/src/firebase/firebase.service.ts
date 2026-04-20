import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = serviceAccountPath ? require(`../../${serviceAccountPath}`) : undefined;

    this.app = admin.apps.length === 0 ? admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }) : admin.app();
    
    // Config Firestore to ignore undefined properties exactly once on init
    try {
      this.app.firestore().settings({ ignoreUndefinedProperties: true });
    } catch (e) {
      // Ignore if already initialized during hot reload
    }
  }

  getAuth() {
    return this.app.auth();
  }

  getFirestore() {
    return this.app.firestore();
  }

  getStorage() {
    return this.app.storage();
  }
}
