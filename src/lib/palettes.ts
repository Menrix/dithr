export const COLOR_BLACK: ColorRgb  = [  0,   0,   0];
export const COLOR_RED: ColorRgb    = [255,   0,   0];
export const COLOR_YELLOW: ColorRgb = [255, 255,   0];
export const COLOR_GREEN: ColorRgb  = [  0, 255,   0];
export const COLOR_BLUE: ColorRgb   = [  0,   0, 255];
export const COLOR_WHITE: ColorRgb  = [255, 255, 255];

export const PALETTES = {
    bw: {
        name: 'BW',
        author: 'Eink',
        colors: [
            COLOR_BLACK,
            COLOR_WHITE,
        ],
        colorIndices: {
            black: 0,
            white: 1,
        },
        devicePalettes: {
            // FMSC default
            // Orders: Black, White
            'variant-1': {
                name: 'Variant #1',
                colors: [
                    [ 20,  20,  20],
                    [205, 205, 205],
                ],
            },
        },
    },

    bwr: {
        name: 'BWR',
        author: 'Eink',
        colors: [
            COLOR_BLACK,
            COLOR_WHITE,
            COLOR_RED,
        ],
        colorIndices: {
            black: 0,
            white: 1,
        },
        devicePalettes: {
            // FMSC default
            // Orders: Black, White, Red
            'variant-1': {
                name: 'Variant #1',
                colors: [
                    [ 20,  20,  20],
                    [205, 205, 205],
                    [110,  25,  25],
                ],
            },
        },
    },

    bwry: {
        name: 'BWRY',
        author: 'Eink',
        colors: [
            COLOR_BLACK,
            COLOR_WHITE,
            COLOR_YELLOW,
            COLOR_RED,
        ],
        colorIndices: {
            black: 0,
            white: 1,
        },
        devicePalettes: {
            // FMSC default
            // Orders: Black, White, Yellow, Red
            'variant-1': {
                name: 'Variant #1',
                colors: [
                    [ 20,  20,  20],
                    [205, 205, 205],
                    [215, 140,  40],
                    [110,  25,  25],
                ],
            },
            // Good Display 1.54
            'variant-2': {
                name: 'Variant #2',
                colors: [
                    // Black Lab: 9, 0, 0
                    [ 25,  25,  25],
                    // White Lab: 63, 0, 2.5
                    [154, 152, 148],
                    // Yellow Lab: 66, 18, 60
                    [216, 146,  16],
                    // Red Lab: 24, 40, 34
                    [115,  19,   4],
                ],
            },
            // Good Display / Xteink Tong Card
            'variant-3': {
                name: 'Variant #3',
                colors: [
                    [ 36,  22,  25],  // Lab: 9, 8, 0
                    [149, 147, 143],  // Lab: 61, 0, 2.5
                    [180, 115,   0],  // Lab: 54, 18, 66
                    [115,  19,   4],  // Lab: 24, 40, 34
                ],
            },
        },
    },

    'spectra-6': {
        name: 'Spectra 6',
        author: 'Eink',
        colors: [
            COLOR_BLACK,
            COLOR_WHITE,
            COLOR_RED,
            COLOR_YELLOW,
            COLOR_GREEN,
            COLOR_BLUE,
        ],
        colorIndices: {
            black: 0,
            white: 1,
        },
        devicePalettes: {
            // Black, White, Red, Yellow, Green, Blue
            'variant-1': {
                name: 'Variant #1',
                colors: [
                    [ 33,  29,  47],
                    [154, 164, 162],
                    [115,  19,   4],
                    [161, 153,   3],
                    [ 52,  91,  58],
                    [ 24,  82, 139],
                ],
            },
            'aitjcize': {
                name: 'aitjcize\'s',
                colors: [
                    [  2,   2,   2],  // #020202
                    [190, 200, 200],  // #BEC8C8
                    [135,  19,   0],  // #871300
                    [205, 202,   0],  // #CDCA00
                    [ 39, 102,  60],  // #27663C
                    [  5,  64, 158],  // #05409E
                ],
            },
            'paperlesspaper': {
                name: 'paperlesspaper\'s',
                colors: [
                    [ 31,  34,  38],  // #1F2226
                    [185, 199, 201],  // #B9C7C9
                    [ 98,  32,  30],  // #62201E
                    [193, 187,  30],  // #C1BB1E
                    [ 53,  86,  58],  // #35563A
                    [ 35,  63, 142],  // #233F8E
                ],
            },
            'bober': {
                name: 'Böber\'s',
                colors: [
                    [ 31,  34,  38],  // #1F2226
                    [214, 214, 214],  // #D6D6D6
                    [234, 72,   67],  // #EA4843
                    [219, 213,  41],  // #DBD529
                    [  6, 116,   6],  // #067406
                    [ 65, 108, 225],  // #416CE1
                ],
            },
            'm5stack': {
                name: 'M5Stack\'s',
                colors: [
                    [ 26,  26,  26],  // #1a1a1a
                    [214, 214, 214],  // D6D6D6
                    [204, 34,    0],  // #cc2200
                    [204, 136,   0],  // #cc8800
                    [ 26, 107,  42],  // #1a6b2a
                    [ 17,  85, 204],  // #1155cc
                ],
            },
        },
    },

    'gray-4': {
        name: 'Gray-4',
        author: 'Eink',
        colors: [
            [  0,   0,   0],  // #000
            [ 85,  85,  85],  // #555
            [170, 170, 170],  // #aaa
            [255, 255, 255],  // #fff
        ],
        colorIndices: {
            black: 0,
            white: 3,
        },
        devicePalettes: {
            /*
            'variant-1': {
                name: 'Variant #1',
                colors: [
                    // L 21
                    [ 50,  50,  50],
                    // L 37
                    [ 87,  87,  87],
                    // L 53
                    [127, 127, 127],
                    // L 69
                    [168, 168, 168],
                ],
            },
            */
        },
    },

    'gray-16': {
        name: 'Gray-16',
        author: 'Eink',
        colors: [
            [  0,   0,   0],
            [ 17,  17,  17],
            [ 34,  34,  34],
            [ 51,  51,  51],
            [ 68,  68,  68],
            [ 85,  85,  85],
            [102, 102, 102],
            [119, 119, 119],
            [136, 136, 136],
            [153, 153, 153],
            [170, 170, 170],
            [187, 187, 187],
            [204, 204, 204],
            [221, 221, 221],
            [238, 238, 238],
            [255, 255, 255],
        ],
        devicePalettes: {},
    },

    'nintendo-gameboy': {
        name: 'Nintendo Gameboy',
        author: 'Nintendo',
        colors: [
            [140, 173,  40],
            [108, 148,  33],
            [ 66, 107,  41],
            [ 33,  66,  49],
        ],
        devicePalettes: {},
    },

    'nintendo-virtual-boy': {
        name: 'Virtual Boy',
        author: 'Nintendo',
        colors: [
            [239,   0,   0],  // #EF0000
            [164,   0,   0],  // #A40000
            [ 85,   0,   0],  // #550000
            [  0,   0,   0],  // #000000
        ],
        devicePalettes: {},
    },

    'funkyfuture': {
        name: 'FunkyFuture',
        author: 'Shamaboy',
        url: 'https://lospec.com/palette-list/funkyfuture-8',
        colors: [
            [ 43,  15,  84],  // #2B0F54
            [171,  31, 101],  // #AB1F65
            [255,  79, 105],  // #FF4F69
            [255, 247, 248],  // #FFF7F8
            [255, 129,  66],  // #FF8142
            [255, 218,  69],  // #FFDA45
            [ 51, 104, 220],  // #3368DC
            [ 73, 231, 236],  // #49E7EC
        ],
        devicePalettes: {},
    },

    'dead-weight-8': {
        name: 'Dead Weight-8',
        author: 'polyphrog',
        url: 'https://lospec.com/palette-list/dead-weight-8',
        colors: [
            [ 73,  84,  53],  // #495435
            [138, 142,  72],  // #8A8E48
            [222, 191, 137],  // #DEBF89
            [164, 101,  62],  // #A4653E
            [144,  46,  41],  // #902E29
            [ 36,  23,  27],  // #24171B
            [ 93,  69,  62],  // #5D453E
            [144, 124, 104],  // #907C68
        ],
        devicePalettes: {},
    },

    'lost-century-24': {
        name: 'Lost Century 24',
        author: 'SurrealEmber',
        url: 'https://lospec.com/palette-list/lost-century-24',
        colors: [
            [182,  92,  95],  // #B65C5F
            [210, 201, 165],  // #D2C9A5
            [198, 164, 130],  // #C6A482
            [188, 133,  99],  // #BC8563
            [184,  99,  67],  // #B86343
            [147,  78,  72],  // #934E48
            [105,  67,  67],  // #694343
            [ 81,  62,  69],  // #513E45
            [ 73,  52,  61],  // #49343D
            [ 91,  69,  95],  // #5B455F
            [113,  98, 125],  // #71627D
            [136, 131, 152],  // #888398
            [154, 155, 167],  // #9A9BA7
            [ 97,  92,  80],  // #615C50
            [141, 121,  78],  // #8D794E
            [170, 143, 104],  // #AA8F68
            [175, 179, 129],  // #AFB381
            [138, 153, 109],  // #8A996D
            [102, 132,  95],  // #66845F
            [ 81, 108,  94],  // #516C5E
            [ 75,  90,  87],  // #4B5A57
            [171, 155, 142],  // #AB9B8E
            [132, 120, 117],  // #847875
            [108,  89,  92],  // #6C595C
        ],
        devicePalettes: {},
    },

    'antiquity16': {
        name: 'antiquity16',
        author: 'ILTA',
        url: 'https://lospec.com/palette-list/antiquity16.json',
        colors: [
            [ 32,  32,  32],  // #202020
            [ 45,  33,  30],  // #2D211E
            [ 69,  41,  35],  // #452923
            [109,  61,  41],  // #6D3D29
            [177, 107,  74],  // #B16B4A
            [232, 159, 110],  // #E89F6E
            [232, 190, 130],  // #E8BE82
            [ 93, 117,  87],  // #5D7557
            [142, 146,  87],  // #8E9257
            [112, 123, 136],  // #707B88
            [138, 167, 172],  // #8AA7AC
            [229,  93,  77],  // #E55D4D
            [241, 134, 108],  // #F1866C
            [210, 103,  48],  // #D26730
            [222, 154,  40],  // #DE9A28
            [232, 216, 165],  // #E8D8A5
        ],
        devicePalettes: {},
    },
    'fantasy-24': {
        name: 'Fantasy 24',
        author: '',
        url: 'https://lospec.com/palette-list/fantasy-24',
        colors: [
            [ 31,  36,  10],  // #1F240A
            [ 57,  87,  28],  // #39571C
            [165, 140,  39],  // #A58C27
            [239, 172,  40],  // #EFAC28
            [239, 216, 161],  // #EFD8A1
            [171,  92,  28],  // #AB5C1C
            [ 24,  63,  57],  // #183F39
            [239, 105,  47],  // #EF692F
            [239, 183, 117],  // #EFB775
            [165,  98,  67],  // #A56243
            [119,  52,  33],  // #773421
            [114,  65,  19],  // #724113
            [ 42,  29,  13],  // #2A1D0D
            [ 57,  42,  28],  // #392A1C
            [104,  76,  60],  // #684C3C
            [146, 126, 106],  // #927E6A
            [ 39, 100, 104],  // #276468
            [239,  58,  12],  // #EF3A0C
            [ 69,  35,  13],  // #45230D
            [ 60, 159, 156],  // #3C9F9C
            [155,  26,  10],  // #9B1A0A
            [ 54,  23,  12],  // #36170C
            [ 85,  15,  10],  // #550F0A
            [ 48,  15,  10],  // #300F0A
        ],
        devicePalettes: {},
    },

    'sunlit-days': {
        name: 'Sunlit Days',
        author: 'Doph',
        url: 'https://lospec.com/palette-list/sunlit-days',
        colors: [
            [242, 233, 211],  // #F2E9D3
            [186, 171, 153],  // #BAAB99
            [149, 130, 127],  // #95827F
            [128, 104, 115],  // #806873
            [ 99,  84,  99],  // #635463
            [ 63,  54,  69],  // #3F3645
            [173, 163,  61],  // #ADA33D
            [124, 127,  85],  // #7C7F55
            [225, 109,  80],  // #E16D50
            [167,  93,  89],  // #A75D59
            [148, 181, 163],  // #94B5A3
            [121, 144, 152],  // #799098
            [109, 115, 141],  // #6D738D
            [232, 184,  92],  // #E8B85C
            [217, 141,  73],  // #D98D49
            [195, 129, 167],  // #C381A7
            [132, 100, 138],  // #84648A
            [230, 138, 133],  // #E68A85
            [158,  96, 109],  // #9E606D
            [238, 208, 155],  // #EED09B
            [220, 154, 114],  // #DC9A72
            [186, 115, 100],  // #BA7364
        ],
        devicePalettes: {},
    },
    'rgr-proto16': {
        name: 'RGR-Proto16',
        author: 'Rugi-Pixels',
        url: 'https://lospec.com/palette-list/rgr-proto16',
        colors: [
            [255, 249, 179],  // #FFF9B3
            [185, 197, 204],  // #B9C5CC
            [ 71, 116, 179],  // #4774B3
            [ 20,  75, 102],  // #144B66
            [143, 179,  71],  // #8FB347
            [ 46, 153,  78],  // #2E994E
            [242, 144, 102],  // #F29066
            [230,  80,  80],  // #E65050
            [112, 125, 124],  // #707D7C
            [ 41,  60,  64],  // #293C40
            [ 23,  11,  26],  // #170B1A
            [ 10,   1,  13],  // #0A010D
            [ 87,   9,  50],  // #570932
            [135,  30,  46],  // #871E2E
            [255, 191,  64],  // #FFBF40
            [204,  20,  36],  // #CC1424
        ],
        devicePalettes: {},
    },
    'blank-vhs-box': {
        name: 'Blank VHS Box',
        author: 'Nathan Kirby',
        url: 'https://lospec.com/palette-list/blank-vhs-box',
        colors: [
            [254, 246, 221],  // #FEF6DD
            [243, 228, 109],  // #F3E46D
            [191, 152, 172],  // #BF98AC
            [177, 115, 154],  // #B1739A
            [237, 114, 117],  // #ED7275
            [235,  91,  43],  // #EB5B2B
            [225,  32,  45],  // #E1202D
            [230, 114,  22],  // #E67216
            [237, 214,   0],  // #EDD600
            [ 14, 135,  67],  // #0E8743
            [160, 197, 198],  // #A0C5C6
            [ 10,  92, 159],  // #0A5C9F
            [ 57,  40, 116],  // #392874
            [195,  52, 121],  // #C33479
            [134,  33,  95],  // #86215F
            [ 33,  36,  37],  // #212425
        ],
        devicePalettes: {},
    },

    'evgalion': {
        name: 'EVGALION',
        author: 'scrapi',
        url: 'https://lospec.com/palette-list/evgalion',
        colors: [
            [  0,   0,   0],  // #000000
            [106,   0, 255],  // #6A00FF
            [  0, 123, 255],  // #007BFF
            [255,   0,   0],  // #FF0000
            [255, 178,   0],  // #FFB200
            [255, 255, 255],  // #FFFFFF
            [110, 255,   0],  // #6EFF00
        ],
        devicePalettes: {},
    },
    'indecision': {
        name: 'Indecision',
        author: 'Nelson SMG',
        url: 'https://lospec.com/palette-list/indecision',
        colors: [
            [255, 244, 224],  // #FFF4E0
            [143, 204, 203],  // #8FCCCB
            [ 68, 148, 137],  // #449489
            [ 40,  87,  99],  // #285763
            [ 47,  43,  92],  // #2F2B5C
            [ 75,  59, 156],  // #4B3B9C
            [ 69, 124, 214],  // #457CD6
            [242, 182,  61],  // #F2B63D
            [212, 110,  51],  // #D46E33
            [227,  66,  98],  // #E34262
            [148,  53,  61],  // #94353D
            [ 87,  37,  59],  // #57253B
            [156, 101, 108],  // #9C656C
            [209, 180, 140],  // #D1B48C
            [180, 186,  71],  // #B4BA47
            [109, 140,  50],  // #6D8C32
            [ 44,  27,  46],  // #2C1B2E
        ],
        devicePalettes: {},
    },
    'urbex-16': {
        name: 'URBEX 16',
        author: 'Rustocrat',
        url: 'https://lospec.com/palette-list/urbex-16',
        colors: [
            [203, 209, 190],  // #CBD1BE
            [143, 147, 137],  // #8F9389
            [ 82,  83,  76],  // #52534C
            [ 38,  32,  29],  // #26201D
            [224, 164, 110],  // #E0A46E
            [145, 164, 122],  // #91A47A
            [ 93, 118,  67],  // #5D7643
            [ 77,  83,  58],  // #4D533A
            [169,  49,  48],  // #A93130
            [122,  19,  56],  // #7A1338
            [131,  70, 100],  // #834664
            [145, 118, 146],  // #917692
            [ 22,   7,  18],  // #160712
            [ 89,  48, 132],  // #593084
            [ 56, 112, 190],  // #3870BE
            [ 87, 159, 180],  // #579FB4
        ],
        devicePalettes: {},
    },

    'windows': {
        name: 'Windows',
        author: 'Microsoft',
        colors: [
            [  0,   0,   0],  // #000000
            [126, 126, 126],  // #7E7E7E
            [190, 190, 190],  // #BEBEBE
            [255, 255, 255],  // #FFFFFF
            [126,   0,   0],  // #7E0000
            [254,   0,   0],  // #FE0000
            [  4, 126,   0],  // #047E00
            [  6, 255,   4],  // #06FF04
            [126, 126,   0],  // #7E7E00
            [255, 255,   4],  // #FFFF04
            [  0,   0, 126],  // #00007E
            [  0,   0, 255],  // #0000FF
            [126,   0, 126],  // #7E007E
            [254,   0, 255],  // #FE00FF
            [  4, 126, 126],  // #047E7E
            [  6, 255, 255],  // #06FFFF
        ],
        devicePalettes: {},
    },
    'msx': {
        name: 'MSX',
        author: 'Microsoft',
        colors: [
            [  0,   0,   0],  // #000000
            [202, 202, 202],  // #CACACA
            [255, 255, 255],  // #FFFFFF
            [183,  94,  81],  // #B75E51
            [217, 100,  89],  // #D96459
            [254, 135, 124],  // #FE877C
            [202, 193,  94],  // #CAC15E
            [221, 206, 133],  // #DDCE85
            [ 60, 160,  66],  // #3CA042
            [ 64, 182,  74],  // #40B64A
            [115, 206, 124],  // #73CE7C
            [ 89,  85, 223],  // #5955DF
            [126, 117, 240],  // #7E75F0
            [100, 218, 238],  // #64DAEE
            [181, 101, 179],  // #B565B3
        ],
        devicePalettes: {},
    },
    'macintosh-ii': {
        name: 'Macintosh II',
        author: 'Apple',
        colors: [
            [255, 255, 255],  // #FFFFFF
            [255, 255,   0],  // #FFFF00
            [255, 101,   0],  // #FF6500
            [220,   0,   0],  // #DC0000
            [255,   0, 151],  // #FF0097
            [ 54,   0, 151],  // #360097
            [  0,   0, 202],  // #0000CA
            [  0, 151, 255],  // #0097FF
            [  0, 168,   0],  // #00A800
            [  0, 101,   0],  // #006500
            [101,  54,   0],  // #653600
            [151, 101,  54],  // #976536
            [185, 185, 185],  // #B9B9B9
            [134, 134, 134],  // #868686
            [ 69,  69,  69],  // #454545
            [  0,   0,   0],  // #000000
        ],
        devicePalettes: {},
    },
    'commodore-64': {
        name: 'Commodore 64',
        author: '',
        colors: [
            [  0,   0,   0],  // #000000
            [ 98,  98,  98],  // #626262
            [137, 137, 137],  // #898989
            [173, 173, 173],  // #ADADAD
            [255, 255, 255],  // #FFFFFF
            [159,  78,  68],  // #9F4E44
            [203, 126, 117],  // #CB7E75
            [109,  84,  18],  // #6D5412
            [161, 104,  60],  // #A1683C
            [201, 212, 135],  // #C9D487
            [154, 226, 155],  // #9AE29B
            [ 92, 171,  94],  // #5CAB5E
            [106, 191, 198],  // #6ABFC6
            [136, 126, 203],  // #887ECB
            [ 80,  69, 155],  // #50459B
            [160,  87, 163],  // #A057A3
        ],
        devicePalettes: {},
    },
    'zx-spectrum': {
        name: 'ZX Spectrum',
        author: '',
        colors: [
            [  0,   0,   0],  // #000000
            [  0,   0, 216],  // #0000D8
            [  0,   0, 255],  // #0000FF
            [216,   0,   0],  // #D80000
            [255,   0,   0],  // #FF0000
            [216,   0, 216],  // #D800D8
            [255,   0, 255],  // #FF00FF
            [  0, 216,   0],  // #00D800
            [  0, 255,   0],  // #00FF00
            [  0, 216, 216],  // #00D8D8
            [  0, 255, 255],  // #00FFFF
            [216, 216,   0],  // #D8D800
            [255, 255,   0],  // #FFFF00
            [216, 216, 216],  // #D8D8D8
            [255, 255, 255],  // #FFFFFF
        ],
        devicePalettes: {},
    },

    // LOSPEC - top palettes 2026-08-29
    'slso8': {
        name: 'SLSO8',
        author: 'Luis Miguel Maldonado',
        url: 'https://lospec.com/palette-list/slso8',
        colors: [
            [ 13,  43,  69],  // #0D2B45
            [ 32,  60,  86],  // #203C56
            [ 84,  78, 104],  // #544E68
            [141, 105, 122],  // #8D697A
            [208, 129,  89],  // #D08159
            [255, 170,  94],  // #FFAA5E
            [255, 212, 163],  // #FFD4A3
            [255, 236, 214],  // #FFECD6
        ],
        devicePalettes: {},
    },
    'oil-6': {
        name: 'Oil 6',
        author: '',
        url: 'https://lospec.com/palette-list/oil-6',
        colors: [
            [251, 245, 239],  // #FBF5EF
            [242, 211, 171],  // #F2D3AB
            [198, 159, 165],  // #C69FA5
            [139, 109, 156],  // #8B6D9C
            [ 73,  77, 126],  // #494D7E
            [ 39,  39,  68],  // #272744
        ],
        devicePalettes: {},
    },
    'sweetie-16': {
        name: 'Sweetie 16',
        author: '',
        url: 'https://lospec.com/palette-list/sweetie-16',
        colors: [
            [ 26,  28,  44],  // #1A1C2C
            [ 93,  39,  93],  // #5D275D
            [177,  62,  83],  // #B13E53
            [239, 125,  87],  // #EF7D57
            [255, 205, 117],  // #FFCD75
            [167, 240, 112],  // #A7F070
            [ 56, 183, 100],  // #38B764
            [ 37, 113, 121],  // #257179
            [ 41,  54, 111],  // #29366F
            [ 59,  93, 201],  // #3B5DC9
            [ 65, 166, 246],  // #41A6F6
            [115, 239, 247],  // #73EFF7
            [244, 244, 244],  // #F4F4F4
            [148, 176, 194],  // #94B0C2
            [ 86, 108, 134],  // #566C86
            [ 51,  60,  87],  // #333C57
        ],
        devicePalettes: {},
    },
    'pico-8': {
        name: 'PICO-8',
        author: '',
        url: 'https://lospec.com/palette-list/pico-8',
        colors: [
            [  0,   0,   0],  // #000000
            [ 29,  43,  83],  // #1D2B53
            [126,  37,  83],  // #7E2553
            [  0, 135,  81],  // #008751
            [171,  82,  54],  // #AB5236
            [ 95,  87,  79],  // #5F574F
            [194, 195, 199],  // #C2C3C7
            [255, 241, 232],  // #FFF1E8
            [255,   0,  77],  // #FF004D
            [255, 163,   0],  // #FFA300
            [255, 236,  39],  // #FFEC27
            [  0, 228,  54],  // #00E436
            [ 41, 173, 255],  // #29ADFF
            [131, 118, 156],  // #83769C
            [255, 119, 168],  // #FF77A8
            [255, 204, 170],  // #FFCCAA
        ],
        devicePalettes: {},
    },
    'lost-century': {
        name: 'Lost Century',
        author: 'SurrealEmber',
        url: 'https://lospec.com/palette-list/lost-century',
        colors: [
            [209, 177, 135],  // #D1B187
            [199, 123,  88],  // #C77B58
            [174,  93,  64],  // #AE5D40
            [121,  68,  74],  // #79444A
            [ 75,  61,  68],  // #4B3D44
            [186, 145,  88],  // #BA9158
            [146, 116,  65],  // #927441
            [ 77,  69,  57],  // #4D4539
            [119, 116,  59],  // #77743B
            [179, 165,  85],  // #B3A555
            [210, 201, 165],  // #D2C9A5
            [140, 171, 161],  // #8CABA1
            [ 75, 114, 110],  // #4B726E
            [ 87,  72,  82],  // #574852
            [132, 120, 117],  // #847875
            [171, 155, 142],  // #AB9B8E
        ],
        devicePalettes: {},
    },
    'na16': {
        name: 'NA16',
        author: 'Nauris',
        url: 'https://lospec.com/palette-list/na16',
        colors: [
            [140, 143, 174],  // #8C8FAE
            [ 88,  69,  99],  // #584563
            [ 62,  33,  55],  // #3E2137
            [154,  99,  72],  // #9A6348
            [215, 155, 125],  // #D79B7D
            [245, 237, 186],  // #F5EDBA
            [192, 199,  65],  // #C0C741
            [100, 125,  52],  // #647D34
            [228, 148,  58],  // #E4943A
            [157,  48,  59],  // #9D303B
            [210, 100, 113],  // #D26471
            [112,  55, 127],  // #70377F
            [126, 196, 193],  // #7EC4C1
            [ 52, 133, 157],  // #34859D
            [ 23,  67,  75],  // #17434B
            [ 31,  14,  28],  // #1F0E1C
        ],
        devicePalettes: {},
    },
    'midnight-ablaze': {
        name: 'Midnight ablaze',
        author: 'Inkpendude ',
        url: 'https://lospec.com/palette-list/midnight-ablaze',
        colors: [
            [255, 130, 116],  // #FF8274
            [213,  60, 106],  // #D53C6A
            [124,  24,  60],  // #7C183C
            [ 70,  14,  43],  // #460E2B
            [ 49,   5,  30],  // #31051E
            [ 31,   5,  16],  // #1F0510
            [ 19,   2,   8],  // #130208
        ],
        devicePalettes: {},
    },
    '1bit-monitor-glow': {
        name: '1bit Monitor Glow',
        author: 'Polyducks',
        url: 'https://lospec.com/palette-list/1bit-monitor-glow',
        colors: [
            [ 34,  35,  35],  // #222323
            [240, 246, 240],  // #F0F6F0
        ],
        devicePalettes: {},
    },
    'twilight-5': {
        name: 'Twilight 5',
        author: 'Star',
        url: 'https://lospec.com/palette-list/twilight-5',
        colors: [
            [251, 187, 173],  // #FBBBAD
            [238, 134, 149],  // #EE8695
            [ 74, 122, 150],  // #4A7A96
            [ 51,  63,  88],  // #333F58
            [ 41,  40,  49],  // #292831
        ],
        devicePalettes: {},
    },
    'steam-lords': {
        name: 'Steam Lords',
        author: 'Slynyrd',
        url: 'https://lospec.com/palette-list/steam-lords',
        colors: [
            [ 33,  59,  37],  // #213B25
            [ 58,  96,  74],  // #3A604A
            [ 79, 119,  84],  // #4F7754
            [161, 159, 124],  // #A19F7C
            [119, 116,  79],  // #77744F
            [119,  92,  79],  // #775C4F
            [ 96,  59,  58],  // #603B3A
            [ 59,  33,  55],  // #3B2137
            [ 23,  14,  25],  // #170E19
            [ 47,  33,  59],  // #2F213B
            [ 67,  58,  96],  // #433A60
            [ 79,  82, 119],  // #4F5277
            [101, 115, 140],  // #65738C
            [124, 148, 161],  // #7C94A1
            [160, 185, 186],  // #A0B9BA
            [192, 209, 204],  // #C0D1CC
        ],
        devicePalettes: {},
    },
    'nyx8': {
        name: 'Nyx8',
        author: '',
        url: 'https://lospec.com/palette-list/nyx8',
        colors: [
            [  8,  20,  30],  // #08141E
            [ 15,  42,  63],  // #0F2A3F
            [ 32,  57,  79],  // #20394F
            [246, 214, 189],  // #F6D6BD
            [195, 163, 138],  // #C3A38A
            [153, 117, 119],  // #997577
            [129,  98, 113],  // #816271
            [ 78,  73,  95],  // #4E495F
        ],
        devicePalettes: {},
    },
    'blessing': {
        name: 'Blessing',
        author: 'clarigariccus',
        url: 'https://lospec.com/palette-list/blessing',
        colors: [
            [116,  86, 155],  // #74569B
            [150, 251, 199],  // #96FBC7
            [247, 255, 174],  // #F7FFAE
            [255, 179, 203],  // #FFB3CB
            [216, 191, 216],  // #D8BFD8
        ],
        devicePalettes: {},
    },
    'eulbink': {
        name: 'Eulbink',
        author: 'Inkpendude ',
        url: 'https://lospec.com/palette-list/eulbink',
        colors: [
            [255, 255, 255],  // #FFFFFF
            [ 12, 230, 242],  // #0CE6F2
            [  0, 152, 219],  // #0098DB
            [ 30,  87, 156],  // #1E579C
            [ 32,  53,  98],  // #203562
            [ 37,  36,  70],  // #252446
            [ 32,  21,  51],  // #201533
        ],
        devicePalettes: {},
    },
    'rust-gold-8': {
        name: 'Rust Gold 8',
        author: 'Trigo Mathmancer',
        url: 'https://lospec.com/palette-list/rust-gold-8',
        colors: [
            [246, 205,  38],  // #F6CD26
            [172, 107,  38],  // #AC6B26
            [ 86,  50,  38],  // #563226
            [ 51,  28,  23],  // #331C17
            [187, 127,  87],  // #BB7F57
            [114,  89,  86],  // #725956
            [ 57,  57,  57],  // #393939
            [ 32,  32,  32],  // #202020
        ],
        devicePalettes: {},
    },
    'ice-cream-gb': {
        name: 'Ice Cream GB',
        author: 'Kerrie Lake',
        url: 'https://lospec.com/palette-list/ice-cream-gb',
        colors: [
            [124,  63,  88],  // #7C3F58
            [235, 107, 111],  // #EB6B6F
            [249, 168, 117],  // #F9A875
            [255, 246, 211],  // #FFF6D3
        ],
        devicePalettes: {},
    },
    'ammo-8': {
        name: 'Ammo-8',
        author: '',
        url: 'https://lospec.com/palette-list/ammo-8',
        colors: [
            [  4,  12,   6],  // #040C06
            [ 17,  35,  24],  // #112318
            [ 30,  58,  41],  // #1E3A29
            [ 48,  93,  66],  // #305D42
            [ 77, 128,  97],  // #4D8061
            [137, 162,  87],  // #89A257
            [190, 220, 127],  // #BEDC7F
            [238, 255, 204],  // #EEFFCC
        ],
        devicePalettes: {},
    },
    'kirokaze-gameboy': {
        name: 'Kirokaze Gameboy',
        author: 'Kirokaze',
        url: 'https://lospec.com/palette-list/kirokaze-gameboy',
        colors: [
            [ 51,  44,  80],  // #332C50
            [ 70, 135, 143],  // #46878F
            [148, 227,  68],  // #94E344
            [226, 243, 228],  // #E2F3E4
        ],
        devicePalettes: {},
    },
    '2bit-demichrome': {
        name: '2bit demichrome',
        author: 'Space Sandwich',
        url: 'https://lospec.com/palette-list/2bit-demichrome',
        colors: [
            [ 33,  30,  32],  // #211E20
            [ 85,  85, 104],  // #555568
            [160, 160, 139],  // #A0A08B
            [233, 239, 236],  // #E9EFEC
        ],
        devicePalettes: {},
    },
    'borkfest': {
        name: 'Borkfest',
        author: 'clarigariccus',
        url: 'https://lospec.com/palette-list/borkfest',
        colors: [
            [223, 215, 133],  // #DFD785
            [235, 194, 117],  // #EBC275
            [243, 153,  73],  // #F39949
            [255, 120,  49],  // #FF7831
            [202,  90,  46],  // #CA5A2E
            [150,  60,  60],  // #963C3C
            [ 58,  40,   2],  // #3A2802
            [ 32,  34,  21],  // #202215
        ],
        devicePalettes: {},
    },
    'mushroom': {
        name: 'Mushroom',
        author: 'Jimison3',
        url: 'https://lospec.com/palette-list/mushroom',
        colors: [
            [ 46,  34,  47],  // #2E222F
            [ 69,  41,  63],  // #45293F
            [122,  48,  69],  // #7A3045
            [153,  61,  65],  // #993D41
            [205, 104,  61],  // #CD683D
            [251, 185,  84],  // #FBB954
            [242, 236, 139],  // #F2EC8B
            [176, 169, 135],  // #B0A987
            [153, 127, 115],  // #997F73
            [102,  89, 100],  // #665964
            [ 68,  56,  70],  // #443846
            [ 87,  96, 105],  // #576069
            [120, 138, 135],  // #788A87
            [169, 178, 162],  // #A9B2A2
        ],
        devicePalettes: {},
    },
    'island-joy-16': {
        name: 'Island Joy 16',
        author: 'Kerrie Lake',
        url: 'https://lospec.com/palette-list/island-joy-16',
        colors: [
            [255, 255, 255],  // #FFFFFF
            [109, 247, 193],  // #6DF7C1
            [ 17, 173, 193],  // #11ADC1
            [ 96, 108, 129],  // #606C81
            [ 57,  52,  87],  // #393457
            [ 30, 136, 117],  // #1E8875
            [ 91, 179,  97],  // #5BB361
            [161, 229,  90],  // #A1E55A
            [247, 228, 118],  // #F7E476
            [249, 146,  82],  // #F99252
            [203,  77, 104],  // #CB4D68
            [106,  55, 113],  // #6A3771
            [201,  36, 100],  // #C92464
            [244, 140, 182],  // #F48CB6
            [247, 182, 158],  // #F7B69E
            [155, 156, 130],  // #9B9C82
        ],
        devicePalettes: {},
    },
    'pollen8': {
        name: 'Pollen8',
        author: 'Conker',
        url: 'https://lospec.com/palette-list/pollen8',
        colors: [
            [115,  70,  76],  // #73464C
            [171,  86, 117],  // #AB5675
            [238, 106, 124],  // #EE6A7C
            [255, 167, 165],  // #FFA7A5
            [255, 224, 126],  // #FFE07E
            [255, 231, 214],  // #FFE7D6
            [114, 220, 187],  // #72DCBB
            [ 52, 172, 186],  // #34ACBA
        ],
        devicePalettes: {},
    },
    'justparchment8': {
        name: 'JustParchment8',
        author: 'JustJimmy',
        url: 'https://lospec.com/palette-list/justparchment8',
        colors: [
            [ 41,  36,  24],  // #292418
            [ 82,  72,  57],  // #524839
            [115, 101,  74],  // #73654A
            [139, 125,  98],  // #8B7D62
            [164, 141, 106],  // #A48D6A
            [189, 165, 131],  // #BDA583
            [205, 186, 148],  // #CDBA94
            [230, 206, 172],  // #E6CEAC
        ],
        devicePalettes: {},
    },
    'chocomilk-8': {
        name: 'CHOCOMILK-8',
        author: 'Blylzz',
        url: 'https://lospec.com/palette-list/chocomilk-8',
        colors: [
            [214, 245, 228],  // #D6F5E4
            [247, 255, 197],  // #F7FFC5
            [180, 199, 136],  // #B4C788
            [138, 137, 105],  // #8A8969
            [139, 106,  68],  // #8B6A44
            [ 98,  85,  76],  // #62554C
            [ 70,  60,  60],  // #463C3C
            [ 49,  38,  41],  // #312629
        ],
        devicePalettes: {},
    },
    'berry-nebula': {
        name: 'Berry Nebula',
        author: 'LostInIndigo',
        url: 'https://lospec.com/palette-list/berry-nebula',
        colors: [
            [108, 237, 237],  // #6CEDED
            [108, 185, 201],  // #6CB9C9
            [109, 133, 165],  // #6D85A5
            [110,  81, 129],  // #6E5181
            [111,  29,  92],  // #6F1D5C
            [ 79,  20,  70],  // #4F1446
            [ 46,  10,  48],  // #2E0A30
            [ 13,   0,  26],  // #0D001A
        ],
        devicePalettes: {},
    },
    'lava-gb': {
        name: 'Lava-GB',
        author: 'Aero',
        url: 'https://lospec.com/palette-list/lava-gb',
        colors: [
            [  5,  31,  57],  // #051F39
            [ 74,  36, 128],  // #4A2480
            [197,  58, 157],  // #C53A9D
            [255, 142, 128],  // #FF8E80
        ],
        devicePalettes: {},
    },
    'hollow': {
        name: 'Hollow',
        author: 'Poltergasm',
        url: 'https://lospec.com/palette-list/hollow',
        colors: [
            [ 15,  15,  27],  // #0F0F1B
            [ 86,  90, 117],  // #565A75
            [198, 183, 190],  // #C6B7BE
            [250, 251, 246],  // #FAFBF6
        ],
        devicePalettes: {},
    },
    'japanese-woodblock': {
        name: 'Japanese Woodblock',
        author: 'Polyducks',
        url: 'https://lospec.com/palette-list/japanese-woodblock',
        colors: [
            [ 43,  40,  33],  // #2B2821
            [ 98,  76,  60],  // #624C3C
            [217, 172, 139],  // #D9AC8B
            [227, 207, 180],  // #E3CFB4
            [ 36,  61,  92],  // #243D5C
            [ 93, 114, 117],  // #5D7275
            [ 92, 139, 147],  // #5C8B93
            [177, 165, 141],  // #B1A58D
            [176,  58,  72],  // #B03A48
            [212, 128,  77],  // #D4804D
            [224, 200, 114],  // #E0C872
            [ 62, 105,  88],  // #3E6958
        ],
        devicePalettes: {},
    },
    'endesga-16': {
        name: 'Endesga 16',
        author: 'ENDESGA',
        url: 'https://lospec.com/palette-list/endesga-16',
        colors: [
            [228, 166, 114],  // #E4A672
            [184, 111,  80],  // #B86F50
            [116,  63,  57],  // #743F39
            [ 63,  40,  50],  // #3F2832
            [158,  40,  53],  // #9E2835
            [229,  59,  68],  // #E53B44
            [251, 146,  43],  // #FB922B
            [255, 231,  98],  // #FFE762
            [ 99, 198,  77],  // #63C64D
            [ 50, 115,  69],  // #327345
            [ 25,  61,  63],  // #193D3F
            [ 79, 103, 129],  // #4F6781
            [175, 191, 210],  // #AFBFD2
            [255, 255, 255],  // #FFFFFF
            [ 44, 232, 244],  // #2CE8F4
            [  4, 132, 209],  // #0484D1
        ],
        devicePalettes: {},
    },
    'ink': {
        name: 'Ink',
        author: '',
        url: 'https://lospec.com/palette-list/ink',
        colors: [
            [ 31,  31,  41],  // #1F1F29
            [ 65,  58,  66],  // #413A42
            [ 89,  96, 112],  // #596070
            [150, 162, 179],  // #96A2B3
            [234, 240, 216],  // #EAF0D8
        ],
        devicePalettes: {},
    },
    'dreamscape8': {
        name: 'Dreamscape8',
        author: 'Kerrie Lake',
        url: 'https://lospec.com/palette-list/dreamscape8',
        colors: [
            [201, 204, 161],  // #C9CCA1
            [202, 160,  90],  // #CAA05A
            [174, 106,  71],  // #AE6A47
            [139,  64,  73],  // #8B4049
            [ 84,  51,  68],  // #543344
            [ 81,  82,  98],  // #515262
            [ 99, 120, 125],  // #63787D
            [142, 160, 145],  // #8EA091
        ],
        devicePalettes: {},
    },
    'vanilla-milkshake': {
        name: 'vanilla milkshake',
        author: 'Space Sandwich',
        url: 'https://lospec.com/palette-list/vanilla-milkshake',
        colors: [
            [ 40,  40,  46],  // #28282E
            [108,  86, 113],  // #6C5671
            [217, 200, 191],  // #D9C8BF
            [249, 130, 132],  // #F98284
            [176, 169, 228],  // #B0A9E4
            [172, 204, 228],  // #ACCCE4
            [179, 227, 218],  // #B3E3DA
            [254, 170, 228],  // #FEAAE4
            [135, 168, 137],  // #87A889
            [176, 235, 147],  // #B0EB93
            [233, 245, 157],  // #E9F59D
            [255, 230, 198],  // #FFE6C6
            [222, 163, 139],  // #DEA38B
            [255, 195, 132],  // #FFC384
            [255, 247, 160],  // #FFF7A0
            [255, 247, 228],  // #FFF7E4
        ],
        devicePalettes: {},
    },
    'inkpink': {
        name: 'INKPINK',
        author: 'Inkpendude ',
        url: 'https://lospec.com/palette-list/inkpink',
        colors: [
            [255, 255, 255],  // #FFFFFF
            [254, 108, 144],  // #FE6C90
            [208,  55, 145],  // #D03791
            [135,  40, 106],  // #87286A
            [ 69,  36,  89],  // #452459
            [ 38,  13,  52],  // #260D34
        ],
        devicePalettes: {},
    },
    'funkyfuture-8': {
        name: 'FunkyFuture 8',
        author: 'Shamaboy',
        url: 'https://lospec.com/palette-list/funkyfuture-8',
        colors: [
            [ 43,  15,  84],  // #2B0F54
            [171,  31, 101],  // #AB1F65
            [255,  79, 105],  // #FF4F69
            [255, 247, 248],  // #FFF7F8
            [255, 129,  66],  // #FF8142
            [255, 218,  69],  // #FFDA45
            [ 51, 104, 220],  // #3368DC
            [ 73, 231, 236],  // #49E7EC
        ],
        devicePalettes: {},
    },
    'curiosities': {
        name: 'curiosities',
        author: 'sukinapan',
        url: 'https://lospec.com/palette-list/curiosities',
        colors: [
            [ 70,  66,  94],  // #46425E
            [ 21, 120, 140],  // #15788C
            [  0, 185, 190],  // #00B9BE
            [255, 238, 204],  // #FFEECC
            [255, 176, 163],  // #FFB0A3
            [255, 105, 115],  // #FF6973
        ],
        devicePalettes: {},
    },
    'cl8uds': {
        name: 'CL8UDS',
        author: '_Nicola',
        url: 'https://lospec.com/palette-list/cl8uds',
        colors: [
            [252, 176, 140],  // #FCB08C
            [239, 157, 127],  // #EF9D7F
            [214, 147, 138],  // #D6938A
            [180, 141, 146],  // #B48D92
            [165, 151, 161],  // #A597A1
            [143, 160, 191],  // #8FA0BF
            [154, 171, 201],  // #9AABC9
            [165, 183, 212],  // #A5B7D4
        ],
        devicePalettes: {},
    },
    'ink-crimson': {
        name: 'Ink-Crimson',
        author: 'Inkpendude ',
        url: 'https://lospec.com/palette-list/ink-crimson',
        colors: [
            [255,   5,  70],  // #FF0546
            [156,  23,  59],  // #9C173B
            [102,  15,  49],  // #660F31
            [ 69,   3,  39],  // #450327
            [ 39,   0,  34],  // #270022
            [ 23,   0,  29],  // #17001D
            [  9,   1,  13],  // #09010D
            [ 12, 230, 242],  // #0CE6F2
            [  0, 152, 219],  // #0098DB
            [ 30,  87, 156],  // #1E579C
        ],
        devicePalettes: {},
    },
    'citrink': {
        name: 'Citrink',
        author: 'Inkpendude ',
        url: 'https://lospec.com/palette-list/citrink',
        colors: [
            [255, 255, 255],  // #FFFFFF
            [252, 246,  96],  // #FCF660
            [178, 217,  66],  // #B2D942
            [ 82, 195,  63],  // #52C33F
            [ 22, 110, 122],  // #166E7A
            [ 37,  77, 112],  // #254D70
            [ 37,  36,  70],  // #252446
            [ 32,  21,  51],  // #201533
        ],
        devicePalettes: {},
    },
    'moonlight-gb': {
        name: 'Moonlight GB',
        author: 'Tofu',
        url: 'https://lospec.com/palette-list/moonlight-gb',
        colors: [
            [ 15,   5,  45],  // #0F052D
            [ 32,  54, 113],  // #203671
            [ 54, 134, 143],  // #36868F
            [ 95, 199,  93],  // #5FC75D
        ],
        devicePalettes: {},
    },
    'mist-gb': {
        name: 'Mist GB',
        author: 'Kerrie Lake',
        url: 'https://lospec.com/palette-list/mist-gb',
        colors: [
            [ 45,  27,   0],  // #2D1B00
            [ 30,  96, 110],  // #1E606E
            [ 90, 185, 168],  // #5AB9A8
            [196, 240, 194],  // #C4F0C2
        ],
        devicePalettes: {},
    },
    'gothic-bit': {
        name: 'Gothic Bit',
        author: 'HiroHi',
        url: 'https://lospec.com/palette-list/gothic-bit',
        colors: [
            [ 14,  14,  18],  // #0E0E12
            [ 26,  26,  36],  // #1A1A24
            [ 51,  51,  70],  // #333346
            [ 83,  83, 115],  // #535373
            [128, 128, 164],  // #8080A4
            [166, 166, 191],  // #A6A6BF
            [193, 193, 210],  // #C1C1D2
            [230, 230, 236],  // #E6E6EC
        ],
        devicePalettes: {},
    },
    'bubblegum-16': {
        name: 'Bubblegum 16',
        author: '🍍PineappleOnPizza🍍(Comissions Open)',
        url: 'https://lospec.com/palette-list/bubblegum-16',
        colors: [
            [ 22,  23,  26],  // #16171A
            [127,   6,  34],  // #7F0622
            [214,  36,  17],  // #D62411
            [255, 132,  38],  // #FF8426
            [255, 209,   0],  // #FFD100
            [250, 253, 255],  // #FAFDFF
            [255, 128, 164],  // #FF80A4
            [255,  38, 116],  // #FF2674
            [148,  33, 106],  // #94216A
            [ 67,   0, 103],  // #430067
            [ 35,  73, 117],  // #234975
            [104, 174, 212],  // #68AED4
            [191, 255,  60],  // #BFFF3C
            [ 16, 210, 117],  // #10D275
            [  0, 120, 153],  // #007899
            [  0,  40,  89],  // #002859
        ],
        devicePalettes: {},
    },
    'commodore64': {
        name: 'Commodore 64',
        author: '',
        url: 'https://lospec.com/palette-list/commodore64',
        colors: [
            [  0,   0,   0],  // #000000
            [ 98,  98,  98],  // #626262
            [137, 137, 137],  // #898989
            [173, 173, 173],  // #ADADAD
            [255, 255, 255],  // #FFFFFF
            [159,  78,  68],  // #9F4E44
            [203, 126, 117],  // #CB7E75
            [109,  84,  18],  // #6D5412
            [161, 104,  60],  // #A1683C
            [201, 212, 135],  // #C9D487
            [154, 226, 155],  // #9AE29B
            [ 92, 171,  94],  // #5CAB5E
            [106, 191, 198],  // #6ABFC6
            [136, 126, 203],  // #887ECB
            [ 80,  69, 155],  // #50459B
            [160,  87, 163],  // #A057A3
        ],
        devicePalettes: {},
    },
    'fading-16': {
        name: 'Fading 16',
        author: 'SurrealEmber',
        url: 'https://lospec.com/palette-list/fading-16',
        colors: [
            [221, 207, 153],  // #DDCF99
            [204, 168, 123],  // #CCA87B
            [185, 122,  96],  // #B97A60
            [156,  82,  78],  // #9C524E
            [119,  66,  81],  // #774251
            [ 75,  61,  68],  // #4B3D44
            [ 78,  84,  99],  // #4E5463
            [ 91, 125, 115],  // #5B7D73
            [142, 159, 125],  // #8E9F7D
            [100,  83,  85],  // #645355
            [140, 124, 121],  // #8C7C79
            [169, 156, 141],  // #A99C8D
            [125, 123,  98],  // #7D7B62
            [170, 162,  93],  // #AAA25D
            [132, 109,  89],  // #846D59
            [168, 138,  94],  // #A88A5E
        ],
        devicePalettes: {},
    },
    'rustic-gb': {
        name: 'Rustic GB',
        author: 'Kerrie Lake',
        url: 'https://lospec.com/palette-list/rustic-gb',
        colors: [
            [ 44,  33,  55],  // #2C2137
            [118,  68,  98],  // #764462
            [237, 180, 161],  // #EDB4A1
            [169, 104, 104],  // #A96868
        ],
        devicePalettes: {},
    },
    'ayy4': {
        name: 'AYY4',
        author: 'Polyducks',
        url: 'https://lospec.com/palette-list/ayy4',
        colors: [
            [  0,  48,  59],  // #00303B
            [255, 119, 119],  // #FF7777
            [255, 206, 150],  // #FFCE96
            [241, 242, 218],  // #F1F2DA
        ],
        devicePalettes: {},
    },
    'nintendo-gameboy-bgb': {
        name: 'Nintendo Gameboy (bgb)',
        author: '',
        url: 'https://lospec.com/palette-list/nintendo-gameboy-bgb',
        colors: [
            [  8,  24,  32],  // #081820
            [ 52, 104,  86],  // #346856
            [136, 192, 112],  // #88C070
            [224, 248, 208],  // #E0F8D0
        ],
        devicePalettes: {},
    },
    'cryptic-ocean': {
        name: 'Cryptic Ocean',
        author: 'Klafooty',
        url: 'https://lospec.com/palette-list/cryptic-ocean',
        colors: [
            [ 42,  23,  59],  // #2A173B
            [ 63,  44,  95],  // #3F2C5F
            [ 68,  63, 123],  // #443F7B
            [ 76,  92, 135],  // #4C5C87
            [105, 128, 158],  // #69809E
            [149, 197, 172],  // #95C5AC
        ],
        devicePalettes: {},
    },
    'hope-diamond': {
        name: 'Hope Diamond',
        author: 'patchouli',
        url: 'https://lospec.com/palette-list/hope-diamond',
        colors: [
            [ 21,  14,  16],  // #150E10
            [ 39,  39,  57],  // #272739
            [ 57,  56,  73],  // #393849
            [ 59,  65,  82],  // #3B4152
            [ 79,  90, 100],  // #4F5A64
            [119, 136, 140],  // #77888C
        ],
        devicePalettes: {},
    },
    'bloodmoon21': {
        name: 'BloodMoon21',
        author: 'Ademack',
        url: 'https://lospec.com/palette-list/bloodmoon21',
        colors: [
            [ 19,   3,  16],  // #130310
            [ 29,   5,  24],  // #1D0518
            [ 39,   7,  33],  // #270721
            [ 60,   9,  33],  // #3C0921
            [ 82,  11,  32],  // #520B20
            [125,  15,  31],  // #7D0F1F
            [168,  20,  29],  // #A8141D
            [211,  24,  28],  // #D3181C
            [255,  37,  43],  // #FF252B
        ],
        devicePalettes: {},
    },
    'obra-dinn-macintosh': {
        name: 'Macintosh',
        author: 'Obra Dinn game',
        colors: [
            [ 51,  51,  25],  // #333319
            [229, 255, 255],  // #e5ffff
        ],
        devicePalettes: {},
    },
    'obra-dinn-ibm-8503': {
        name: 'IBM 8503',
        author: 'Obra Dinn game',
        colors: [
            [ 46,  48,  55],  // #2E3037
            [235, 229, 206],  // #EBE5CE
        ],
        devicePalettes: {},
    },
    'obra-dinn-ibm-5151': {
        name: 'IBM 5151',
        author: 'Obra Dinn game',
        colors: [
            [ 37,  52,  47],  // #25342F
            [  1, 235,  95],  // #01EB5F
        ],
        devicePalettes: {},
    },
    'obra-dinn-zenith-zvm-1240': {
        name: 'Zenith ZVM 1240',
        author: 'Obra Dinn game',
        colors: [
            [ 63,  41,  30],  // #3F291E
            [253, 202,  85],  // #FDCA55
        ],
        devicePalettes: {},
    },
    'obra-dinn-commodore-1084': {
        name: 'Commodore 1084',
        author: 'Obra Dinn game',
        colors: [
            [ 64,  49, 142],  // #40318E
            [136, 215, 222],  // #88D7DE
        ],
        devicePalettes: {},
    },
} satisfies Record<string, PaletteInfo>;

export const PALETTE_ORDERS = {
    'Eink': [
        // 'kaleido-3-64',
        'spectra-6',
        'bwry',
        'bwr',
        'bw',
        'gray-16',
        'gray-4',
    ],
    'Gaming': [
        'pico-8',
        'nintendo-gameboy',
        'nintendo-gameboy-bgb',
        'nintendo-virtual-boy',
    ],
    'Hardware': [
        'windows',
        'macintosh-ii',
        'msx',
        'commodore-64',
        'zx-spectrum',
    ],
     'Lospec': [
        'sweetie-16',
        'lost-century',
        'na16',
        'steam-lords',
        'island-joy-16',
        'endesga-16',
        'vanilla-milkshake',
        'bubblegum-16',
        'commodore64',
        'fading-16',
        'mushroom',
        'japanese-woodblock',
        'ink-crimson',
        'bloodmoon21',
        'slso8',
        'nyx8',
        'rust-gold-8',
        'ammo-8',
        'borkfest',
        'pollen8',
        'justparchment8',
        'chocomilk-8',
        'berry-nebula',
        'dreamscape8',
        'funkyfuture-8',
        'cl8uds',
        'citrink',
        'gothic-bit',
        'midnight-ablaze',
        'eulbink',
        'oil-6',
        'inkpink',
        'curiosities',
        'cryptic-ocean',
        'hope-diamond',
        'twilight-5',
        'blessing',
        'ink',
        'ice-cream-gb',
        'kirokaze-gameboy',
        '2bit-demichrome',
        'lava-gb',
        'hollow',
        'moonlight-gb',
        'mist-gb',
        'rustic-gb',
        'ayy4',
        '1bit-monitor-glow',
        'obra-dinn-macintosh',
        'obra-dinn-ibm-8503',
        'obra-dinn-ibm-5151',
        'obra-dinn-zenith-zvm-1240',
        'obra-dinn-commodore-1084',
    ],
} satisfies Record<string, PaletteId[]>;

export const DEVICE_PALETTES = {
    bw: {
        id: 'bw',
        name: 'BW',
    },
    bwr: {
        id: 'bwr',
        name: 'BWR/BWY',
    },
    bwry: {
        id: 'bwry',
        name: 'BWRY',
    },
    'spectra-6': {
        id: 'spectra-6',
        name: 'Spectra 6',
    },
    'gray-4': {
        id: 'gray-4',
        name: 'Gray-4',
    },
    /*
    'kaleido-3-64': {
        id: 'kaleido-3-64',
        name: 'Kaleido 3-64',
    },
    */
} satisfies Partial<Record<PaletteId, PaletteConfig>>;

export const FULL_COLOR_PALETTE = 'pico-8' satisfies PaletteId;

export function getPalette(id: PaletteId) {
    return PALETTES[id === 'full-color' ? FULL_COLOR_PALETTE : id];
}

export function getPaletteName(id: PaletteId): string {
    if (id === 'full-color') {
        return 'Full-color';
    }

    return PALETTES[id].name;
}

export function getDevicePalette(mainId: PaletteId, subId: string | undefined): DevicePaletteInfo | null  {
    if (mainId === 'full-color' || !subId) {
        return null;
    }

    const info = PALETTES[mainId];
    if (!info || !('devicePalettes' in info)) {
        return null;
    }

    const devicePalettes = info.devicePalettes;
    if (!(subId in devicePalettes)) {
        return null;
    }

    return devicePalettes[subId as keyof typeof devicePalettes];
}
