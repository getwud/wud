// @ts-nocheck
import { isGreater } from './index';
import { getTagCandidates } from '../watchers/providers/docker/Docker';

describe('Exotic Tag Resolution & Hardening Regressions (#1278)', () => {
    describe('a) Bare major tags vs variant/architecture tags', () => {
        test('redis:8 vs redis:32bit-stretch -> NOT an upgrade', () => {
            expect(isGreater('32bit-stretch', '8')).toBe(false);
        });

        test('gotenberg/gotenberg:8 vs 8-libreoffice-cloudrun -> NOT an upgrade', () => {
            expect(isGreater('8-libreoffice-cloudrun', '8')).toBe(false);
        });

        test('postgres:18 vs postgres:19beta3-trixie -> NOT an upgrade', () => {
            expect(isGreater('19beta3-trixie', '18')).toBe(false);
        });

        test('redis:8 vs redis:9 -> IS an upgrade', () => {
            expect(isGreater('9', '8')).toBe(true);
        });

        test('uptime-kuma:2 vs 2-slim-rootless -> NOT an upgrade (#1271)', () => {
            expect(isGreater('2-slim-rootless', '2')).toBe(false);
        });
    });

    describe('b) Flavor preservation by default (when no includeTags is set)', () => {
        test('8.8-alpine vs 8.8-trixie -> NOT an upgrade', () => {
            expect(isGreater('8.8-trixie', '8.8-alpine')).toBe(false);
        });

        test('8.8-alpine vs 17.2-bookworm -> NOT an upgrade', () => {
            expect(isGreater('17.2-bookworm', '8.8-alpine')).toBe(false);
        });

        test('8.8-alpine vs 8.9-alpine -> IS an upgrade', () => {
            expect(isGreater('8.9-alpine', '8.8-alpine')).toBe(true);
        });

        test('16.3 vs 17.2-bullseye -> NOT an upgrade (#509)', () => {
            expect(isGreater('17.2-bullseye', '16.3')).toBe(false);
        });

        test('16.3 vs 17.2 -> IS an upgrade', () => {
            expect(isGreater('17.2', '16.3')).toBe(true);
        });

        test('17-alpine vs 17.2-bookworm -> NOT an upgrade (#514)', () => {
            expect(isGreater('17.2-bookworm', '17-alpine')).toBe(false);
        });

        test('17-alpine vs 18-alpine -> IS an upgrade', () => {
            expect(isGreater('18-alpine', '17-alpine')).toBe(true);
        });
    });

    describe('c) Numeric suffix ordering (Checkmk #1276)', () => {
        test('2.5.0p13 vs 2.5.0p9 -> NOT an upgrade (p13 is newer than p9)', () => {
            expect(isGreater('2.5.0p9', '2.5.0p13')).toBe(false);
        });

        test('2.5.0p13 vs 2.5.0p14 -> IS an upgrade', () => {
            expect(isGreater('2.5.0p14', '2.5.0p13')).toBe(true);
        });
    });

    describe('d) 4-segment versions (Sonarr, Emby #1261, #375)', () => {
        test('4.0.13.2932-ls274 vs 4.0.9.1000-ls50 -> NOT an upgrade', () => {
            expect(isGreater('4.0.9.1000-ls50', '4.0.13.2932-ls274')).toBe(
                false,
            );
        });

        test('4.0.13.2932-ls274 vs 4.0.13.2933-ls275 -> IS an upgrade', () => {
            expect(isGreater('4.0.13.2933-ls275', '4.0.13.2932-ls274')).toBe(
                true,
            );
        });

        test('4.0.13.2932-ls274 vs 4.0.14.3000-ls280 -> IS an upgrade', () => {
            expect(isGreater('4.0.14.3000-ls280', '4.0.13.2932-ls274')).toBe(
                true,
            );
        });

        test('4.9.0.12 vs 4.9.0.9 -> NOT an upgrade (#375)', () => {
            expect(isGreater('4.9.0.9', '4.9.0.12')).toBe(false);
        });

        test('4.9.0.12 vs 4.9.0.13 -> IS an upgrade', () => {
            expect(isGreater('4.9.0.13', '4.9.0.12')).toBe(true);
        });
    });

    describe('e) Pre-releases on stable channels (#883, #759, #69)', () => {
        test('2025.10 vs 2025.12-rc2 -> NOT an upgrade', () => {
            expect(isGreater('2025.12-rc2', '2025.10')).toBe(false);
        });

        test('2025.10 vs 2025.12.0 -> IS an upgrade', () => {
            expect(isGreater('2025.12.0', '2025.10')).toBe(true);
        });

        test('18.0-trixie vs 18rc1-trixie -> NOT an upgrade', () => {
            expect(isGreater('18rc1-trixie', '18.0-trixie')).toBe(false);
        });

        test('18.0-trixie vs 18.1-trixie -> IS an upgrade', () => {
            expect(isGreater('18.1-trixie', '18.0-trixie')).toBe(true);
        });

        test('2021.9.1 vs 2021.9.1-rc3 -> NOT an upgrade', () => {
            expect(isGreater('2021.9.1-rc3', '2021.9.1')).toBe(false);
        });

        test('1.2.3 vs 1.2.3-beta1 -> NOT an upgrade', () => {
            expect(isGreater('1.2.3-beta1', '1.2.3')).toBe(false);
        });
    });

    describe('f) Commit hashes and branches starting with digits (#71, #69, #530)', () => {
        test('2021.9.1 vs 13696b1 -> NOT an upgrade', () => {
            expect(isGreater('13696b1', '2021.9.1')).toBe(false);
        });

        test('5.7.0 vs fix__69 -> NOT an upgrade', () => {
            expect(isGreater('fix__69', '5.7.0')).toBe(false);
        });

        test('7.2.0 vs feature__502_specific_triggers -> NOT an upgrade', () => {
            expect(isGreater('feature__502_specific_triggers', '7.2.0')).toBe(
                false,
            );
        });
    });

    describe('g) CalVer vs SemVer legacy tags (#866, #335)', () => {
        test('10.11.4 vs 2021.12.16 -> NOT an upgrade', () => {
            expect(isGreater('2021.12.16', '10.11.4')).toBe(false);
        });

        test('10.11.4 vs 10.11.5 -> IS an upgrade', () => {
            expect(isGreater('10.11.5', '10.11.4')).toBe(true);
        });

        test('4.6.2 vs 20.04.1 -> NOT an upgrade', () => {
            expect(isGreater('20.04.1', '4.6.2')).toBe(false);
        });

        test('4.6.2 vs 4.6.3 -> IS an upgrade', () => {
            expect(isGreater('4.6.3', '4.6.2')).toBe(true);
        });
    });

    describe('h) Platform & architecture prefixes (#135, #625)', () => {
        test('2.27.1 vs windowsltsc2022-amd64-2.9.3 -> NOT an upgrade', () => {
            expect(isGreater('windowsltsc2022-amd64-2.9.3', '2.27.1')).toBe(
                false,
            );
        });

        test('linux-amd64-2.11.1-alpine vs linux-amd64-2.9.3-alpine -> NOT an upgrade', () => {
            expect(
                isGreater(
                    'linux-amd64-2.9.3-alpine',
                    'linux-amd64-2.11.1-alpine',
                ),
            ).toBe(false);
        });

        test('linux-amd64-2.11.1-alpine vs linux-amd64-2.13.1-alpine -> IS an upgrade', () => {
            expect(
                isGreater(
                    'linux-amd64-2.13.1-alpine',
                    'linux-amd64-2.11.1-alpine',
                ),
            ).toBe(true);
        });
    });

    describe('i) Build/Date tags and custom extensions (#1183, #1190, #1206)', () => {
        test('2025-08-05 vs 2025-06-03 -> NOT an upgrade', () => {
            expect(isGreater('2025-06-03', '2025-08-05')).toBe(false);
        });

        test('2025-08-05 vs 2025-09-01 -> IS an upgrade', () => {
            expect(isGreater('2025-09-01', '2025-08-05')).toBe(true);
        });

        test('18-vectorchord1.1.1 vs 18-vectorchord0.5.3 -> NOT an upgrade', () => {
            expect(
                isGreater('18-vectorchord0.5.3', '18-vectorchord1.1.1'),
            ).toBe(false);
        });

        test('18-vectorchord1.1.1 vs 18-vectorchord1.1.2 -> IS an upgrade', () => {
            expect(
                isGreater('18-vectorchord1.1.2', '18-vectorchord1.1.1'),
            ).toBe(true);
        });

        test('1.43.3.10896-cb3ebc72d vs 1.43.3.10861-07dfddaeb -> NOT an upgrade', () => {
            expect(
                isGreater('1.43.3.10861-07dfddaeb', '1.43.3.10896-cb3ebc72d'),
            ).toBe(false);
        });

        test('1.43.3.10896-cb3ebc72d vs 1.43.3.10897-abcdef123 -> IS an upgrade', () => {
            expect(
                isGreater('1.43.3.10897-abcdef123', '1.43.3.10896-cb3ebc72d'),
            ).toBe(true);
        });
    });

    describe('Candidate filtering via getTagCandidates()', () => {
        const mockLog = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() };

        test('redis:8: filters out 32bit-stretch and 8-libreoffice-cloudrun, keeps 9', () => {
            const container = {
                image: {
                    tag: { value: '8', semver: true },
                },
            };
            const tags = ['8', '32bit-stretch', '8-libreoffice-cloudrun', '9'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['9']);
        });

        test('gotenberg/gotenberg:8: filters out 8-libreoffice-cloudrun, keeps 9', () => {
            const container = {
                image: {
                    tag: { value: '8', semver: true },
                },
            };
            const tags = ['8', '8-libreoffice-cloudrun', '9'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['9']);
        });

        test('postgres:18: filters out 19beta3-trixie, keeps 19', () => {
            const container = {
                image: {
                    tag: { value: '18', semver: true },
                },
            };
            const tags = ['18', '19beta3-trixie', '19'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['19']);
        });

        test('redis:8.8-alpine: preserves alpine flavor, rejects trixie and bookworm', () => {
            const container = {
                image: {
                    tag: { value: '8.8-alpine', semver: true },
                },
            };
            const tags = [
                '8.8-alpine',
                '8.8-trixie',
                '17.2-bookworm',
                '8.9-alpine',
            ];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['8.9-alpine']);
        });

        test('checkmk:2.5.0p13: orders p14 above p13, rejects p9', () => {
            const container = {
                image: {
                    tag: { value: '2.5.0p13', semver: true },
                },
            };
            const tags = ['2.5.0p13', '2.5.0p9', '2.5.0p14'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['2.5.0p14']);
        });

        test('ghcr.io/goauthentik/server:2025.10: rejects 2025.12-rc2 on stable channel, keeps 2025.12', () => {
            const container = {
                image: {
                    tag: { value: '2025.10', semver: true },
                },
            };
            const tags = ['2025.10', '2025.12-rc2', '2025.12'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['2025.12']);
        });

        test('postgres:18.0-trixie: rejects 18rc1-trixie, keeps 18.1-trixie', () => {
            const container = {
                image: {
                    tag: { value: '18.0-trixie', semver: true },
                },
            };
            const tags = ['18.0-trixie', '18rc1-trixie', '18.1-trixie'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['18.1-trixie']);
        });

        test('esphome/esphome:2021.9.1: rejects git hash 13696b1, keeps 2021.9.2', () => {
            const container = {
                image: {
                    tag: { value: '2021.9.1', semver: true },
                },
            };
            const tags = ['2021.9.1', '13696b1', '2021.9.2'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['2021.9.2']);
        });

        test('getwud/wud:5.7.0: rejects branch tag fix__69, keeps 5.8.0', () => {
            const container = {
                image: {
                    tag: { value: '5.7.0', semver: true },
                },
            };
            const tags = ['5.7.0', 'fix__69', '5.8.0'];
            const candidates = getTagCandidates(container, tags, mockLog);
            expect(candidates).toEqual(['5.8.0']);
        });
    });
});
