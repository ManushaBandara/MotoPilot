import {
  useEffect,
  useRef,
} from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

type TabKey =
  | "rides"
  | "navigation"
  | "dashboard"
  | "media"
  | "fuel";

type CockpitTabBarProps = {
  activeTab: TabKey;
};

type TabDefinition = {
  key: TabKey;
  label: string;
  route: string;
};

const TABS: TabDefinition[] = [
  {
    key: "rides",
    label: "RIDES",
    route: "/rides",
  },
  {
    key: "navigation",
    label: "NAV",
    route: "/navigation",
  },
  {
    key: "dashboard",
    label: "DASH",
    route: "/",
  },
  {
    key: "media",
    label: "MEDIA",
    route: "/media",
  },
  {
    key: "fuel",
    label: "FUEL",
    route: "/fuel",
  },
];

const COLORS = {
  glass: "rgba(14, 19, 28, 0.88)",
  glassBorder:
    "rgba(255,255,255,0.07)",

  accent: "#FFB84D",
  accentSoft: "#FFD98A",

  primary: "#E9EEF5",
  muted: "#737F91",

  dark: "#080B10",
};

const BAR_HEIGHT = 82;
const CENTER_SIZE = 64;
const CENTER_RIM_SIZE = 76;

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

const SIDE_PADDING = 22;

const SLOT_WIDTH =
  (SCREEN_WIDTH - SIDE_PADDING * 2) /
  5;

function getWrappedDifference(
  routeIndex: number,
  activeIndex: number
): number {
  let diff =
    routeIndex - activeIndex;

  if (diff > 2) {
    diff -= 5;
  }

  if (diff < -2) {
    diff += 5;
  }

  return diff;
}

/* ============================================================
   CUSTOM ICONS
   ============================================================ */

type IconProps = {
  size: number;
  color: string;
  strokeWidth?: number;
};

function RidesIcon({
  size,
  color,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
      }}
    >
      <View
        style={[
          styles.helmetIcon,
          {
            width: size * 0.72,
            height: size * 0.55,
            borderWidth: strokeWidth,
            borderColor: color,
            borderRadius:
              size * 0.32,
            left: size * 0.14,
            top: size * 0.18,
          },
        ]}
      />

      <View
        style={[
          styles.iconLine,
          {
            width: size * 0.38,
            height: strokeWidth,
            backgroundColor: color,
            left: size * 0.31,
            top: size * 0.67,
          },
        ]}
      />

      <View
        style={[
          styles.iconLine,
          {
            width: size * 0.18,
            height: strokeWidth,
            backgroundColor: color,
            left: size * 0.55,
            top: size * 0.42,
          },
        ]}
      />
    </View>
  );
}

function NavigationIcon({
  size,
  color,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
      }}
    >
      <View
        style={[
          styles.navArrow,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderLeftWidth:
              strokeWidth,
            borderTopWidth:
              strokeWidth,
            borderColor: color,
            transform: [
              {
                rotate: "45deg",
              },
            ],
            left: size * 0.19,
            top: size * 0.08,
          },
        ]}
      />

      <View
        style={[
          styles.iconLine,
          {
            width: size * 0.48,
            height: strokeWidth,
            backgroundColor: color,
            left: size * 0.26,
            top: size * 0.52,
            transform: [
              {
                rotate: "-45deg",
              },
            ],
          },
        ]}
      />
    </View>
  );
}

function DashboardIcon({
  size,
  color,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={[
          styles.gaugeOuter,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderWidth:
              strokeWidth,
            borderColor: color,
            borderRadius:
              size * 0.36,
          },
        ]}
      >
        <View
          style={[
            styles.gaugeNeedle,
            {
              width:
                strokeWidth,
              height: size * 0.28,
              backgroundColor:
                color,
              transform: [
                {
                  rotate: "-42deg",
                },
              ],
            },
          ]}
        />

        <View
          style={[
            styles.gaugeDot,
            {
              width: size * 0.1,
              height: size * 0.1,
              borderRadius:
                size * 0.05,
              backgroundColor:
                color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function MediaIcon({
  size,
  color,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={[
          styles.musicCircle,
          {
            width: size * 0.72,
            height: size * 0.72,
            borderWidth:
              strokeWidth,
            borderColor: color,
            borderRadius:
              size * 0.36,
          },
        ]}
      />

      <View
        style={[
          styles.musicStem,
          {
            width: strokeWidth,
            height: size * 0.32,
            backgroundColor: color,
            left: size * 0.56,
            top: size * 0.2,
          },
        ]}
      />

      <View
        style={[
          styles.musicBar,
          {
            width: size * 0.2,
            height: strokeWidth,
            backgroundColor: color,
            left: size * 0.42,
            top: size * 0.2,
          },
        ]}
      />

      <View
        style={[
          styles.musicNote,
          {
            width: size * 0.17,
            height: size * 0.17,
            borderRadius:
              size * 0.085,
            backgroundColor:
              color,
            left: size * 0.47,
            top: size * 0.51,
          },
        ]}
      />
    </View>
  );
}

function FuelIcon({
  size,
  color,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
      }}
    >
      <View
        style={[
          styles.fuelBody,
          {
            width: size * 0.48,
            height: size * 0.62,
            borderWidth:
              strokeWidth,
            borderColor: color,
            borderRadius:
              size * 0.08,
            left: size * 0.18,
            top: size * 0.18,
          },
        ]}
      />

      <View
        style={[
          styles.fuelCap,
          {
            width: size * 0.18,
            height: strokeWidth,
            backgroundColor:
              color,
            left: size * 0.33,
            top: size * 0.1,
          },
        ]}
      />

      <View
        style={[
          styles.fuelLine,
          {
            width: size * 0.2,
            height: strokeWidth,
            backgroundColor:
              color,
            left: size * 0.3,
            top: size * 0.47,
          },
        ]}
      />

      <View
        style={[
          styles.fuelHose,
          {
            width: size * 0.2,
            height: size * 0.3,
            borderRightWidth:
              strokeWidth,
            borderTopWidth:
              strokeWidth,
            borderColor: color,
            borderTopRightRadius:
              size * 0.08,
            left: size * 0.62,
            top: size * 0.27,
          },
        ]}
      />
    </View>
  );
}

function TabIcon({
  tab,
  active,
}: {
  tab: TabKey;
  active: boolean;
}) {
  const size = active ? 32 : 27;

  const color = active
    ? COLORS.primary
    : COLORS.muted;

  const props: IconProps = {
    size,
    color,
    strokeWidth: active
      ? 2.1
      : 1.7,
  };

  switch (tab) {
    case "rides":
      return <RidesIcon {...props} />;

    case "navigation":
      return (
        <NavigationIcon
          {...props}
        />
      );

    case "dashboard":
      return (
        <DashboardIcon
          {...props}
        />
      );

    case "media":
      return (
        <MediaIcon
          {...props}
        />
      );

    case "fuel":
      return <FuelIcon {...props} />;
  }
}

/* ============================================================
   TAB BAR
   ============================================================ */

export function CockpitTabBar({
  activeTab,
}: CockpitTabBarProps) {
  const router = useRouter();

  const activeIndex = Math.max(
    0,
    TABS.findIndex(
      (tab) =>
        tab.key === activeTab
    )
  );

  const animations = useRef(
    TABS.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(3),
      scale: new Animated.Value(1),
      opacity:
        new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    const animationList: Animated.CompositeAnimation[] =
      [];

    TABS.forEach(
      (tab, index) => {
        const diff =
          getWrappedDifference(
            index,
            activeIndex
          );

        const targetX =
          diff * SLOT_WIDTH;

        const isActive =
          diff === 0;

        animationList.push(
          Animated.spring(
            animations[index].x,
            {
              toValue: targetX,
              tension: 60,
              friction: 7,
              useNativeDriver: true,
            }
          )
        );

        animationList.push(
          Animated.spring(
            animations[index].y,
            {
              toValue: isActive
                ? -18
                : 3,
              tension: 65,
              friction: 8,
              useNativeDriver: true,
            }
          )
        );

        animationList.push(
          Animated.spring(
            animations[index].scale,
            {
              toValue: isActive
                ? 1.08
                : 1,
              tension: 70,
              friction: 8,
              useNativeDriver: true,
            }
          )
        );

        animationList.push(
          Animated.timing(
            animations[index]
              .opacity,
            {
              toValue: isActive
                ? 0
                : 1,
              duration: 150,
              useNativeDriver: true,
            }
          )
        );
      }
    );

    Animated.parallel(
      animationList
    ).start();
  }, [
    activeIndex,
    animations,
  ]);

  function handlePress(
    tab: TabDefinition
  ) {
    if (
      tab.key === activeTab
    ) {
      return;
    }

    router.push(
      tab.route as never
    );
  }

  const ActiveIcon = () => (
    <TabIcon
      tab={
        TABS[activeIndex].key
      }
      active
    />
  );

  return (
    <View
      pointerEvents="box-none"
      style={styles.wrapper}
    >
      {/* ======================================================
          STATIC CENTER FOCAL CIRCLE
          ====================================================== */}

      <View
        pointerEvents="none"
        style={styles.centerRim}
      >
        <View
          style={styles.centerGlow}
        />

        <View
          style={styles.centerCircle}
        >
          <View
            style={styles.centerInner}
          />
        </View>
      </View>

      {/* ======================================================
          FROSTED GLASS BAR
          ====================================================== */}

      <BlurView
        intensity={50}
        tint="dark"
        style={styles.blur}
      >
        <View
          style={styles.glassOverlay}
        >
          <View
            style={styles.topHighlight}
          />

          {TABS.map(
            (tab, index) => {
              const isActive =
                tab.key === activeTab;

              return (
                <Animated.View
                  key={tab.key}
                  style={[
                    styles.tab,
                    {
                      left:
                        SIDE_PADDING +
                        SLOT_WIDTH *
                          index +
                        SLOT_WIDTH /
                          2 -
                        28,
                      transform: [
                        {
                          translateX:
                            animations[
                              index
                            ].x,
                        },
                        {
                          translateY:
                            animations[
                              index
                            ].y,
                        },
                        {
                          scale:
                            animations[
                              index
                            ].scale,
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      handlePress(
                        tab
                      )
                    }
                    style={
                      styles.touchTarget
                    }
                  >
                    <View
                      style={
                        styles.iconHolder
                      }
                    >
                      <TabIcon
                        tab={tab.key}
                        active={
                          isActive
                        }
                      />
                    </View>

                    <Animated.View
                      style={[
                        styles.labelContainer,
                        {
                          opacity:
                            animations[
                              index
                            ].opacity,
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        {tab.label}
                      </Text>
                    </Animated.View>
                  </Pressable>
                </Animated.View>
              );
            }
          )}
        </View>
      </BlurView>

      {/* ======================================================
          ACTIVE CENTER ICON
          ====================================================== */}

      <View
        pointerEvents="none"
        style={styles.centerIconContainer}
      >
        <ActiveIcon />
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles =
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: BAR_HEIGHT + 18,
      zIndex: 100,
      elevation: 100,
    },

    blur: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: BAR_HEIGHT,
      overflow: "hidden",
      borderTopWidth: 1,
      borderTopColor:
        COLORS.glassBorder,
    },

    glassOverlay: {
      flex: 1,
      backgroundColor:
        COLORS.glass,
      overflow: "hidden",
    },

    topHighlight: {
      position: "absolute",
      top: 0,
      left: "16%",
      right: "16%",
      height: 1,
      backgroundColor:
        "rgba(255,255,255,0.055)",
    },

    centerRim: {
      position: "absolute",
      left:
        SCREEN_WIDTH / 2 -
        CENTER_RIM_SIZE / 2,
      top: -15,
      width:
        CENTER_RIM_SIZE,
      height:
        CENTER_RIM_SIZE,
      borderRadius:
        CENTER_RIM_SIZE / 2,
      backgroundColor:
        COLORS.dark,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 5,
    },

    centerGlow: {
      position: "absolute",
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        "rgba(255,184,77,0.13)",
    },

    centerCircle: {
      width: CENTER_SIZE,
      height: CENTER_SIZE,
      borderRadius:
        CENTER_SIZE / 2,
      backgroundColor:
        COLORS.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor:
        COLORS.accent,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.4,
      shadowRadius: 13,
      elevation: 11,
    },

    centerInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.25)",
      backgroundColor:
        "rgba(8,11,16,0.08)",
    },

    centerIconContainer: {
      position: "absolute",
      left:
        SCREEN_WIDTH / 2 -
        CENTER_SIZE / 2,
      top: -4,
      width: CENTER_SIZE,
      height: CENTER_SIZE,
      borderRadius:
        CENTER_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
    },

    tab: {
      position: "absolute",
      top: 10,
      width: 56,
      height: 68,
      alignItems: "center",
      justifyContent:
        "flex-start",
      zIndex: 10,
    },

    touchTarget: {
      width: 64,
      height: 68,
      alignItems: "center",
      justifyContent:
        "flex-start",
    },

    iconHolder: {
      width: 42,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },

    labelContainer: {
      marginTop: 3,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
    },

    label: {
      fontSize: 9,
      lineHeight: 12,
      fontWeight: "700",
      letterSpacing: 1.5,
      color: COLORS.muted,
    },

    helmetIcon: {
      position: "absolute",
    },

    iconLine: {
      position: "absolute",
    },

    navArrow: {
      position: "absolute",
    },

    gaugeOuter: {
      alignItems: "center",
      justifyContent: "center",
    },

    gaugeNeedle: {
      position: "absolute",
      bottom: "50%",
      left: "50%",
      transformOrigin:
        "center bottom",
    },

    gaugeDot: {
      position: "absolute",
    },

    musicCircle: {
      alignItems: "center",
      justifyContent: "center",
    },

    musicStem: {
      position: "absolute",
    },

    musicBar: {
      position: "absolute",
    },

    musicNote: {
      position: "absolute",
    },

    fuelBody: {
      position: "absolute",
    },

    fuelCap: {
      position: "absolute",
    },

    fuelLine: {
      position: "absolute",
    },

    fuelHose: {
      position: "absolute",
    },
  });