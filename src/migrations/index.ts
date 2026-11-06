import * as migration_20261015_122220_initial from './20261015_122220_initial';
import * as migration_20261027_062454_delivery_slots from './20261027_062454_delivery_slots';
import * as migration_20261027_075905_notify_emails from './20261027_075905_notify_emails';
import * as migration_20261101_060236_manual_exchange from './20261101_060236_manual_exchange';
import * as migration_20261106_080218_segments_open from './20261106_080218_segments_open';

export const migrations = [
  {
    up: migration_20261015_122220_initial.up,
    down: migration_20261015_122220_initial.down,
    name: '20261015_122220_initial',
  },
  {
    up: migration_20261027_062454_delivery_slots.up,
    down: migration_20261027_062454_delivery_slots.down,
    name: '20261027_062454_delivery_slots',
  },
  {
    up: migration_20261027_075905_notify_emails.up,
    down: migration_20261027_075905_notify_emails.down,
    name: '20261027_075905_notify_emails',
  },
  {
    up: migration_20261101_060236_manual_exchange.up,
    down: migration_20261101_060236_manual_exchange.down,
    name: '20261101_060236_manual_exchange',
  },
  {
    up: migration_20261106_080218_segments_open.up,
    down: migration_20261106_080218_segments_open.down,
    name: '20261106_080218_segments_open'
  },
];
