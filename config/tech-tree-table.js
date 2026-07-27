/** Tech tree table: layout / requires / cost. Runtime reads this first. */
window.TECH_TREE_TABLE = {
  "version": 15,
  "canvas": {
    "width": 5600,
    "height": 5800
  },
  "techs": {
    "unlock_workbench": {
      "x": 2000,
      "y": 2000,
      "parent": null,
      "size": "medium",
      "cost": {
        "wood": 5
      }
    },
    "unlock_forest": {
      "x": 2400,
      "y": 1600,
      "parent": "unlock_tool_crafting",
      "size": "medium",
      "cost": {}
    },
    "unlock_house_capacity": {
      "x": 1600,
      "y": 2000,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "wood": 18,
        "plank": 8,
        "stone": 6
      }
    },
    "unlock_house_build_discount_v1": {
      "x": 1233,
      "y": 2100,
      "parent": "unlock_house_capacity",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      }
    },
    "unlock_house_build_discount_v2": {
      "x": 1005,
      "y": 2100,
      "parent": "unlock_house_build_discount_v1",
      "size": "medium",
      "cost": {
        "brick": 15,
        "stone_slab": 8
      }
    },
    "unlock_house_build_discount_v3": {
      "x": 778,
      "y": 2100,
      "parent": "unlock_house_build_discount_v2",
      "size": "medium",
      "cost": {
        "brick": 25,
        "iron_ingot": 5,
        "lime": 8
      }
    },
    "unlock_house_work_speed_v1": {
      "x": 1233,
      "y": 1700,
      "parent": "unlock_house_capacity",
      "size": "medium",
      "cost": {
        "wood": 20,
        "plank": 10
      }
    },
    "unlock_house_work_speed_v2": {
      "x": 1005,
      "y": 1700,
      "parent": "unlock_house_work_speed_v1",
      "size": "medium",
      "cost": {
        "wood": 30,
        "plank": 15,
        "stone": 10
      }
    },
    "unlock_house_work_speed_v3": {
      "x": 778,
      "y": 1700,
      "parent": "unlock_house_work_speed_v2",
      "size": "medium",
      "cost": {
        "plank": 25,
        "stone_slab": 12
      }
    },
    "unlock_house_work_speed_v4": {
      "x": 573,
      "y": 1700,
      "parent": "unlock_house_work_speed_v3",
      "size": "medium",
      "cost": {
        "brick": 20,
        "pitch": 8
      }
    },
    "unlock_house_work_speed_v5": {
      "x": 353,
      "y": 1700,
      "parent": "unlock_house_work_speed_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 8,
        "gear": 3
      }
    },
    "unlock_tool_crafting": {
      "x": 2400,
      "y": 1800,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {}
    },
    "unlock_farm": {
      "x": 1600,
      "y": 1600,
      "parent": "unlock_food_gather_speed_v1",
      "size": "medium",
      "cost": {
        "wood": 20,
        "clay": 15,
        "brick": 8,
        "food": 10
      }
    },
    "unlock_food_gather_speed_v1": {
      "x": 1600,
      "y": 1800,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "food": 20,
        "wood": 12,
        "plank": 6
      }
    },
    "unlock_food_gather_speed_v2": {
      "x": 1600,
      "y": 1400,
      "parent": "unlock_farm",
      "size": "medium",
      "cost": {
        "food": 35,
        "plank": 12,
        "brick": 8
      }
    },
    "unlock_food_gather_speed_v3": {
      "x": 1600,
      "y": 1000,
      "parent": "unlock_pasture",
      "size": "medium",
      "cost": {
        "food": 55,
        "brick": 12,
        "glass": 6
      }
    },
    "unlock_breed_saving_v1": {
      "x": 1233,
      "y": 1900,
      "parent": "unlock_house_capacity",
      "size": "medium",
      "cost": {
        "food": 25,
        "wood": 10
      }
    },
    "unlock_breed_saving_v2": {
      "x": 1005,
      "y": 1900,
      "parent": "unlock_breed_saving_v1",
      "size": "medium",
      "cost": {
        "food": 40,
        "plank": 15
      }
    },
    "unlock_breed_saving_v3": {
      "x": 778,
      "y": 1900,
      "parent": "unlock_breed_saving_v2",
      "size": "medium",
      "cost": {
        "food": 60,
        "brick": 12
      }
    },
    "unlock_breed_saving_v4": {
      "x": 573,
      "y": 1900,
      "parent": "unlock_breed_saving_v3",
      "size": "medium",
      "cost": {
        "food": 90,
        "glass": 10,
        "copper_ingot": 5
      }
    },
    "unlock_breed_saving_v5": {
      "x": 353,
      "y": 1900,
      "parent": "unlock_breed_saving_v4",
      "size": "medium",
      "cost": {
        "food": 120,
        "wood": 4,
        "glass": 12
      }
    },
    "unlock_pasture": {
      "x": 1600,
      "y": 1200,
      "parent": "unlock_food_gather_speed_v2",
      "size": "medium",
      "cost": {
        "brick": 18,
        "plank": 20,
        "glass": 8,
        "food": 30
      }
    },
    "unlock_auto_click": {
      "x": 1600,
      "y": 2200,
      "parent": "unlock_click_power",
      "size": "medium",
      "cost": {
        "wood": 5
      }
    },
    "unlock_click_power": {
      "x": 1800,
      "y": 2000,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 10
      }
    },
    "unlock_tool_durability_v1": {
      "x": 1209,
      "y": 2702,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 10,
        "stone": 10,
        "gravel": 10,
        "clay": 10,
        "resin": 10
      }
    },
    "unlock_tool_durability_v2": {
      "x": 1209,
      "y": 2860,
      "parent": "unlock_tool_durability_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 14,
        "clay": 12,
        "gravel": 10
      }
    },
    "unlock_tool_durability_v3": {
      "x": 1208,
      "y": 3020,
      "parent": "unlock_tool_durability_v2",
      "size": "medium",
      "cost": {
        "plank": 10,
        "stone_slab": 8,
        "brick": 6,
        "resin": 8
      }
    },
    "unlock_tool_durability_v4": {
      "x": 1209,
      "y": 3180,
      "parent": "unlock_tool_durability_v3",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "glass": 8,
        "brick": 10,
        "pitch": 4
      }
    },
    "unlock_tool_durability_v5": {
      "x": 1209,
      "y": 3340,
      "parent": "unlock_tool_durability_v4",
      "size": "medium",
      "cost": {
        "plank": 10,
        "stone_slab": 10,
        "glass": 10,
        "brick": 10,
        "rosin": 10,
        "copper_ingot": 5
      }
    },
    "unlock_tool_efficiency_v1": {
      "x": 1308,
      "y": 2702,
      "parent": "unlock_tool_durability_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone_slab": 10,
        "clay": 8
      }
    },
    "unlock_tool_efficiency_v2": {
      "x": 1308,
      "y": 2858,
      "parent": "unlock_tool_efficiency_v1",
      "size": "medium",
      "cost": {
        "plank": 18,
        "brick": 8,
        "gravel": 12
      }
    },
    "unlock_tool_efficiency_v3": {
      "x": 1310,
      "y": 3021,
      "parent": "unlock_tool_efficiency_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 12,
        "brick": 10,
        "pitch": 4
      }
    },
    "unlock_tool_efficiency_v4": {
      "x": 1307,
      "y": 3180,
      "parent": "unlock_tool_efficiency_v3",
      "size": "medium",
      "cost": {
        "brick": 14,
        "copper_ingot": 4,
        "glass": 8
      }
    },
    "unlock_tool_efficiency_v5": {
      "x": 1310,
      "y": 3341,
      "parent": "unlock_tool_efficiency_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "pitch": 6
      }
    },
    "unlock_quarry": {
      "x": 2400,
      "y": 1400,
      "parent": "unlock_forest",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 5
      }
    },
    "unlock_clay_pit": {
      "x": 2600,
      "y": 1600,
      "parent": "unlock_forest",
      "size": "medium",
      "cost": {
        "wood": 10,
        "plank": 3
      }
    },
    "unlock_gravel": {
      "x": 2800,
      "y": 1600,
      "parent": "unlock_clay_pit",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 4,
        "stone": 6
      }
    },
    "unlock_resin": {
      "x": 2400,
      "y": 1200,
      "parent": "unlock_quarry",
      "size": "medium",
      "cost": {
        "wood": 14,
        "stone": 6
      }
    },
    "unlock_pitch": {
      "x": 3631,
      "y": 3311,
      "parent": "unlock_brick_craft",
      "size": "medium",
      "cost": {
        "resin": 12,
        "wood": 8
      }
    },
    "unlock_brick_craft": {
      "x": 3371,
      "y": 3051,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "clay": 8,
        "wood": 5
      }
    },
    "unlock_treasure_chest": {
      "x": 2000,
      "y": 1800,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {}
    },
    "unlock_advanced_workbench": {
      "x": 3371,
      "y": 3311,
      "parent": "unlock_brick_craft",
      "size": "medium",
      "cost": {
        "brick": 12,
        "limestone": 10,
        "plank": 15,
        "stone_slab": 10,
        "gravel": 8
      }
    },
    "unlock_furnace": {
      "x": 3371,
      "y": 3571,
      "parent": "unlock_advanced_workbench",
      "size": "medium",
      "cost": {
        "stone_slab": 16,
        "plank": 10,
        "pitch": 4
      }
    },
    "unlock_copper_mine": {
      "x": 3150,
      "y": 1800,
      "parent": "unlock_gravel",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone_slab": 12,
        "limestone": 8
      }
    },
    "unlock_coal_mine": {
      "x": 3150,
      "y": 1600,
      "parent": "unlock_gravel",
      "size": "medium",
      "cost": {
        "stone_slab": 14,
        "plank": 10,
        "coal": 5
      }
    },
    "unlock_iron_mine": {
      "x": 3450,
      "y": 1600,
      "parent": "unlock_copper_mine",
      "size": "medium",
      "parents": [
        "unlock_copper_mine",
        "unlock_coal_mine"
      ],
      "cost": {
        "plank": 16,
        "stone": 12,
        "copper_ore": 10
      }
    },
    "unlock_limestone": {
      "x": 2400,
      "y": 1000,
      "parent": "unlock_resin",
      "size": "medium",
      "cost": {
        "stone": 16,
        "plank": 10,
        "gravel": 12
      }
    },
    "unlock_lime_craft": {
      "x": 3631,
      "y": 3571,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {
        "limestone": 12,
        "coal": 5,
        "brick": 6
      }
    },
    "unlock_gear_craft": {
      "x": 3371,
      "y": 3831,
      "parent": "unlock_furnace",
      "size": "medium",
      "cost": {
        "copper_ingot": 8,
        "pitch": 6
      }
    },
    "unlock_defense_training": {
      "x": 1358,
      "y": 3197,
      "parent": "unlock_tool_durability_v5",
      "size": "medium",
      "cost": {
        "gear": 4,
        "plank": 20,
        "copper_ingot": 5
      }
    },
    "unlock_combat_hp_v1": {
      "x": 1358,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "food": 30,
        "plank": 15
      }
    },
    "unlock_combat_hp_v2": {
      "x": 1359,
      "y": 3498,
      "parent": "unlock_combat_hp_v1",
      "size": "medium",
      "cost": {
        "food": 45,
        "brick": 12,
        "stone_slab": 10
      }
    },
    "unlock_combat_hp_v3": {
      "x": 1358,
      "y": 3637,
      "parent": "unlock_combat_hp_v2",
      "size": "medium",
      "cost": {
        "food": 60,
        "iron_ingot": 6,
        "bronze": 8
      }
    },
    "unlock_combat_hp_v4": {
      "x": 1355,
      "y": 3778,
      "parent": "unlock_combat_hp_v3",
      "size": "medium",
      "cost": {
        "food": 80,
        "steel": 4,
        "lime": 12
      }
    },
    "unlock_combat_hp_v5": {
      "x": 1359,
      "y": 3917,
      "parent": "unlock_combat_hp_v4",
      "size": "medium",
      "cost": {
        "food": 100,
        "steel": 8,
        "silver_ingot": 4
      }
    },
    "unlock_combat_atk_v1": {
      "x": 1578,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "copper_ingot": 6,
        "stone_slab": 10
      }
    },
    "unlock_combat_atk_v2": {
      "x": 1799,
      "y": 3497,
      "parent": "unlock_combat_atk_v1",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "bronze": 8
      }
    },
    "unlock_combat_atk_v3": {
      "x": 2018,
      "y": 3634,
      "parent": "unlock_combat_atk_v2",
      "size": "medium",
      "cost": {
        "iron_ingot": 10,
        "gear": 4
      }
    },
    "unlock_combat_atk_v4": {
      "x": 2238,
      "y": 3777,
      "parent": "unlock_combat_atk_v3",
      "size": "medium",
      "cost": {
        "steel": 6,
        "pitch": 10
      }
    },
    "unlock_combat_atk_v5": {
      "x": 2458,
      "y": 3917,
      "parent": "unlock_combat_atk_v4",
      "size": "medium",
      "cost": {
        "steel": 10,
        "gold_ingot": 3
      }
    },
    "unlock_combat_aspd_v1": {
      "x": 1138,
      "y": 3357,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "resin": 10,
        "plank": 12
      }
    },
    "unlock_combat_aspd_v2": {
      "x": 920,
      "y": 3496,
      "parent": "unlock_combat_aspd_v1",
      "size": "medium",
      "cost": {
        "pitch": 8,
        "plank": 18
      }
    },
    "unlock_combat_aspd_v3": {
      "x": 700,
      "y": 3638,
      "parent": "unlock_combat_aspd_v2",
      "size": "medium",
      "cost": {
        "pitch": 12,
        "gear": 3
      }
    },
    "unlock_combat_aspd_v4": {
      "x": 477,
      "y": 3776,
      "parent": "unlock_combat_aspd_v3",
      "size": "medium",
      "cost": {
        "gear": 6,
        "iron_ingot": 4
      }
    },
    "unlock_combat_aspd_v5": {
      "x": 258,
      "y": 3917,
      "parent": "unlock_combat_aspd_v4",
      "size": "medium",
      "cost": {
        "gear": 10,
        "steel": 4
      }
    },
    "unlock_tough_skin": {
      "x": 915,
      "y": 3356,
      "parent": "unlock_defense_training",
      "size": "medium",
      "cost": {
        "food": 40,
        "resin": 12,
        "copper_ingot": 6
      }
    },
    "unlock_gate_lv2": {
      "x": 3111,
      "y": 3051,
      "parent": "unlock_brick_craft",
      "size": "medium",
      "cost": {
        "plank": 15,
        "stone": 20
      }
    },
    "unlock_gate_lv3": {
      "x": 2851,
      "y": 3051,
      "parent": "unlock_gate_lv2",
      "size": "medium",
      "cost": {
        "stone_slab": 20,
        "brick": 15,
        "pitch": 6
      }
    },
    "unlock_gate_lv4": {
      "x": 2591,
      "y": 3051,
      "parent": "unlock_gate_lv3",
      "size": "medium",
      "cost": {
        "brick": 25,
        "iron_ingot": 12,
        "lime": 10
      }
    },
    "unlock_gate_repair_speed_v1": {
      "x": 3111,
      "y": 3311,
      "parent": "unlock_gate_lv2",
      "size": "medium",
      "cost": {
        "brick": 12,
        "plank": 16,
        "stone": 10
      }
    },
    "unlock_gate_repair_speed_v2": {
      "x": 2851,
      "y": 3311,
      "parent": "unlock_gate_repair_speed_v1",
      "size": "medium",
      "cost": {
        "brick": 18,
        "iron_ingot": 4,
        "pitch": 6
      }
    },
    "unlock_gate_repair_speed_v3": {
      "x": 2591,
      "y": 3311,
      "parent": "unlock_gate_repair_speed_v2",
      "size": "medium",
      "cost": {
        "iron_ingot": 8,
        "lime": 8,
        "gear": 2
      }
    },
    "unlock_gate_repair_speed_v4": {
      "x": 2331,
      "y": 3311,
      "parent": "unlock_gate_repair_speed_v3",
      "size": "medium",
      "cost": {
        "steel": 4,
        "brick": 20,
        "gear": 4
      }
    },
    "unlock_furnace_upgrade": {
      "x": 3522,
      "y": 3837,
      "parent": "unlock_iron_smelt",
      "size": "medium",
      "cost": {
        "iron_ingot": 10,
        "coke": 12,
        "brick": 15
      }
    },
    "unlock_worker_efficiency_v1": {
      "x": 1233,
      "y": 2300,
      "parent": "unlock_house_capacity",
      "size": "medium",
      "cost": {
        "wood": 16,
        "stone": 12,
        "plank": 6
      }
    },
    "unlock_worker_efficiency_v2": {
      "x": 1005,
      "y": 2300,
      "parent": "unlock_worker_efficiency_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 16,
        "food": 20
      }
    },
    "unlock_worker_efficiency_v3": {
      "x": 778,
      "y": 2300,
      "parent": "unlock_worker_efficiency_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "plank": 15,
        "food": 30
      }
    },
    "unlock_worker_efficiency_v4": {
      "x": 573,
      "y": 2300,
      "parent": "unlock_worker_efficiency_v3",
      "size": "medium",
      "cost": {
        "glass": 8,
        "copper_ingot": 4,
        "food": 40
      }
    },
    "unlock_worker_efficiency_v5": {
      "x": 353,
      "y": 2300,
      "parent": "unlock_worker_efficiency_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "gear": 2,
        "food": 50
      }
    },
    "unlock_point_recovery": {
      "x": 3782,
      "y": 4097,
      "parent": "unlock_furnace_upgrade",
      "size": "medium",
      "cost": {
        "stone": 16,
        "gravel": 12,
        "plank": 10,
        "coal": 8
      }
    },
    "point_up_forest_count": {
      "x": 2205,
      "y": 1400,
      "parent": "unlock_forest",
      "size": "small"
    },
    "point_up_forest_cooldown": {
      "x": 2216,
      "y": 1601,
      "parent": "unlock_forest",
      "size": "small"
    },
    "point_up_forest_refine": {
      "x": 2000,
      "y": 1400,
      "parent": "point_up_forest_count",
      "size": "small",
      "parents": [
        "point_up_forest_count",
        "point_up_forest_cooldown"
      ]
    },
    "point_up_quarry_count": {
      "x": 2600,
      "y": 1200,
      "parent": "unlock_quarry",
      "size": "small"
    },
    "point_up_quarry_cooldown": {
      "x": 2601,
      "y": 1400,
      "parent": "unlock_quarry",
      "size": "small"
    },
    "point_up_quarry_refine": {
      "x": 2800,
      "y": 1200,
      "parent": "point_up_quarry_count",
      "size": "small",
      "parents": [
        "point_up_quarry_count",
        "point_up_quarry_cooldown"
      ]
    },
    "point_up_clay_pit_count": {
      "x": 2800,
      "y": 1800,
      "parent": "unlock_clay_pit",
      "size": "small"
    },
    "point_up_clay_pit_cooldown": {
      "x": 2600,
      "y": 1800,
      "parent": "unlock_clay_pit",
      "size": "small"
    },
    "point_up_clay_pit_refine": {
      "x": 2800,
      "y": 2000,
      "parent": "point_up_clay_pit_count",
      "size": "small",
      "parents": [
        "point_up_clay_pit_count",
        "point_up_clay_pit_cooldown"
      ]
    },
    "point_up_copper_mine_count": {
      "x": 3350,
      "y": 2000,
      "parent": "unlock_copper_mine",
      "size": "small"
    },
    "point_up_copper_mine_cooldown": {
      "x": 3150,
      "y": 2000,
      "parent": "unlock_copper_mine",
      "size": "small"
    },
    "point_up_copper_mine_refine": {
      "x": 3350,
      "y": 2200,
      "parent": "point_up_copper_mine_count",
      "size": "small",
      "parents": [
        "point_up_copper_mine_count",
        "point_up_copper_mine_cooldown"
      ]
    },
    "point_up_coal_mine_count": {
      "x": 3350,
      "y": 1400,
      "parent": "unlock_coal_mine",
      "size": "small"
    },
    "point_up_coal_mine_cooldown": {
      "x": 3150,
      "y": 1400,
      "parent": "unlock_coal_mine",
      "size": "small"
    },
    "point_up_coal_mine_refine": {
      "x": 3350,
      "y": 1200,
      "parent": "point_up_coal_mine_count",
      "size": "small",
      "parents": [
        "point_up_coal_mine_count",
        "point_up_coal_mine_cooldown"
      ]
    },
    "point_up_gravel_bed_count": {
      "x": 3000,
      "y": 1402,
      "parent": "unlock_gravel",
      "size": "small"
    },
    "point_up_gravel_bed_cooldown": {
      "x": 2800,
      "y": 1400,
      "parent": "unlock_gravel",
      "size": "small"
    },
    "point_up_gravel_bed_refine": {
      "x": 3000,
      "y": 1200,
      "parent": "point_up_gravel_bed_count",
      "size": "small",
      "parents": [
        "point_up_gravel_bed_count",
        "point_up_gravel_bed_cooldown"
      ]
    },
    "point_up_limestone_quarry_count": {
      "x": 2600,
      "y": 800,
      "parent": "unlock_limestone",
      "size": "small"
    },
    "point_up_limestone_quarry_cooldown": {
      "x": 2600,
      "y": 1000,
      "parent": "unlock_limestone",
      "size": "small"
    },
    "point_up_limestone_quarry_refine": {
      "x": 2800,
      "y": 800,
      "parent": "point_up_limestone_quarry_count",
      "size": "small",
      "parents": [
        "point_up_limestone_quarry_count",
        "point_up_limestone_quarry_cooldown"
      ]
    },
    "point_up_resin_grove_count": {
      "x": 2200,
      "y": 1000,
      "parent": "unlock_resin",
      "size": "small"
    },
    "point_up_resin_grove_cooldown": {
      "x": 2200,
      "y": 1200,
      "parent": "unlock_resin",
      "size": "small"
    },
    "point_up_resin_grove_refine": {
      "x": 2000,
      "y": 1000,
      "parent": "point_up_resin_grove_count",
      "size": "small",
      "parents": [
        "point_up_resin_grove_count",
        "point_up_resin_grove_cooldown"
      ]
    },
    "point_up_iron_mine_count": {
      "x": 3450,
      "y": 1800,
      "parent": "unlock_iron_mine",
      "size": "small"
    },
    "point_up_iron_mine_cooldown": {
      "x": 3650,
      "y": 1800,
      "parent": "unlock_iron_mine",
      "size": "small"
    },
    "point_up_iron_mine_refine": {
      "x": 3650,
      "y": 2000,
      "parent": "point_up_iron_mine_count",
      "size": "small",
      "parents": [
        "point_up_iron_mine_count",
        "point_up_iron_mine_cooldown"
      ]
    },
    "point_up_farm_cooldown": {
      "x": 1800,
      "y": 1600,
      "parent": "unlock_farm",
      "size": "small"
    },
    "point_up_farm_efficiency": {
      "x": 1400,
      "y": 1600,
      "parent": "unlock_farm",
      "size": "small"
    },
    "point_up_pasture_cooldown": {
      "x": 1800,
      "y": 1200,
      "parent": "unlock_pasture",
      "size": "small"
    },
    "point_up_pasture_efficiency": {
      "x": 1400,
      "y": 1200,
      "parent": "unlock_pasture",
      "size": "small"
    },
    "point_up_treasure_chest_dropRate": {
      "x": 2200,
      "y": 1800,
      "parent": "unlock_treasure_chest",
      "size": "small"
    },
    "point_up_treasure_chest_rewardTypes": {
      "x": 2000,
      "y": 1600,
      "parent": "unlock_treasure_chest",
      "size": "small"
    },
    "point_up_treasure_chest_rewardAmount": {
      "x": 1800,
      "y": 1800,
      "parent": "unlock_treasure_chest",
      "size": "small"
    },
    "unlock_stone_slab": {
      "x": 2260,
      "y": 2260,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "stone": 10,
        "wood": 6
      }
    },
    "unlock_iron_smelt": {
      "x": 1740,
      "y": 2260,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 16,
        "coal": 6
      }
    },
    "unlock_steel_smelt": {
      "x": 1480,
      "y": 2260,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "iron_ingot": 8,
        "coal": 10,
        "brick": 10
      }
    },
    "unlock_plank_craft": {
      "x": 2130,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 8
      }
    },
    "unlock_house_upgrade_1": {
      "x": 1740,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 15,
        "stone": 8
      }
    },
    "unlock_house_upgrade_2": {
      "x": 1480,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "clay": 12,
        "stone": 10,
        "wood": 10
      }
    },
    "unlock_house_upgrade_3": {
      "x": 1220,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "brick": 10,
        "glass": 4,
        "plank": 12
      }
    },
    "unlock_house_upgrade_4": {
      "x": 960,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "coke": 3,
        "limestone": 4
      }
    },
    "unlock_tools_lv1": {
      "x": 1740,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 8
      }
    },
    "unlock_tools_lv2": {
      "x": 1480,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "stone": 12,
        "plank": 6
      }
    },
    "unlock_tools_lv3": {
      "x": 1220,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "plank": 10
      }
    },
    "unlock_tools_lv4": {
      "x": 960,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "steel": 2,
        "plank": 12
      }
    },
    "unlock_weapons_lv1": {
      "x": 2260,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 4
      }
    },
    "unlock_weapons_lv2": {
      "x": 2520,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "plank": 8
      }
    },
    "unlock_weapons_lv3": {
      "x": 2780,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "iron_ingot": 6,
        "plank": 10
      }
    },
    "unlock_weapons_lv4": {
      "x": 3040,
      "y": 1740,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "steel": 3,
        "plank": 12
      }
    },
    "unlock_auto_produce": {
      "x": 2390,
      "y": 2130,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "plank": 10,
        "stone": 8,
        "wood": 12
      }
    },
    "unlock_efficient_repair_v1": {
      "x": 2260,
      "y": 1580,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 6
      }
    },
    "unlock_efficient_repair_v2": {
      "x": 2260,
      "y": 1420,
      "parent": "unlock_efficient_repair_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      }
    },
    "unlock_efficient_repair_v3": {
      "x": 2260,
      "y": 1260,
      "parent": "unlock_efficient_repair_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "plank": 14
      }
    },
    "unlock_efficient_repair_v4": {
      "x": 2260,
      "y": 1100,
      "parent": "unlock_efficient_repair_v3",
      "size": "medium",
      "cost": {
        "brick": 10,
        "pitch": 5
      }
    },
    "unlock_efficient_repair_v5": {
      "x": 2260,
      "y": 940,
      "parent": "unlock_efficient_repair_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "glass": 6,
        "plank": 10
      }
    },
    "unlock_craft_efficiency_v1": {
      "x": 1740,
      "y": 2520,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "wood": 12,
        "plank": 6
      }
    },
    "unlock_craft_efficiency_v2": {
      "x": 1480,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      }
    },
    "unlock_craft_efficiency_v3": {
      "x": 1220,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "brick": 6
      }
    },
    "unlock_craft_efficiency_v4": {
      "x": 960,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v3",
      "size": "medium",
      "cost": {
        "brick": 10,
        "pitch": 4,
        "plank": 10
      }
    },
    "unlock_craft_efficiency_v5": {
      "x": 700,
      "y": 2520,
      "parent": "unlock_craft_efficiency_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 3,
        "glass": 6,
        "gear": 1
      }
    },
    "unlock_altar": {
      "x": 400,
      "y": 2000,
      "parent": "unlock_workbench",
      "size": "medium",
      "cost": {
        "stone": 20,
        "plank": 15,
        "wood": 25
      }
    },
    "unlock_sanctuary_gather": {
      "x": 160,
      "y": 2260,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 16,
        "stone": 14,
        "food": 20
      }
    },
    "unlock_sanctuary_craft": {
      "x": 520,
      "y": 2260,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 18,
        "brick": 8,
        "stone_slab": 8
      }
    },
    "unlock_sanctuary_war": {
      "x": 880,
      "y": 2260,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 16,
        "iron_ingot": 4,
        "stone_slab": 10
      }
    },
    "unlock_sanctuary_efficiency": {
      "x": 1240,
      "y": 2260,
      "parent": "unlock_altar",
      "size": "medium",
      "cost": {
        "plank": 20,
        "glass": 8,
        "pitch": 6
      }
    },
    "unlock_sanctuary_gather_chance_v1": {
      "x": 40,
      "y": 2520,
      "parent": "unlock_sanctuary_gather",
      "size": "medium",
      "cost": {
        "wood": 15,
        "plank": 8
      }
    },
    "unlock_sanctuary_gather_chance_v2": {
      "x": 40,
      "y": 2680,
      "parent": "unlock_sanctuary_gather_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 12
      }
    },
    "unlock_sanctuary_gather_chance_v3": {
      "x": 40,
      "y": 2840,
      "parent": "unlock_sanctuary_gather_chance_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 14
      }
    },
    "unlock_sanctuary_gather_chance_v4": {
      "x": 40,
      "y": 3000,
      "parent": "unlock_sanctuary_gather_chance_v3",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      }
    },
    "unlock_sanctuary_gather_chance_v5": {
      "x": 40,
      "y": 3160,
      "parent": "unlock_sanctuary_gather_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "glass": 6
      }
    },
    "unlock_sanctuary_gather_power_v1": {
      "x": 280,
      "y": 2520,
      "parent": "unlock_sanctuary_gather",
      "size": "medium",
      "cost": {
        "wood": 12,
        "stone": 10
      }
    },
    "unlock_sanctuary_gather_power_v2": {
      "x": 280,
      "y": 2680,
      "parent": "unlock_sanctuary_gather_power_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone_slab": 8
      }
    },
    "unlock_sanctuary_gather_power_v3": {
      "x": 280,
      "y": 2840,
      "parent": "unlock_sanctuary_gather_power_v2",
      "size": "medium",
      "cost": {
        "brick": 8,
        "clay": 12
      }
    },
    "unlock_sanctuary_gather_power_v4": {
      "x": 280,
      "y": 3000,
      "parent": "unlock_sanctuary_gather_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "plank": 12
      }
    },
    "unlock_sanctuary_gather_power_v5": {
      "x": 280,
      "y": 3160,
      "parent": "unlock_sanctuary_gather_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "glass": 8
      }
    },
    "unlock_sanctuary_craft_chance_v1": {
      "x": 400,
      "y": 2520,
      "parent": "unlock_sanctuary_craft",
      "size": "medium",
      "cost": {
        "plank": 12,
        "wood": 10
      }
    },
    "unlock_sanctuary_craft_chance_v2": {
      "x": 400,
      "y": 2680,
      "parent": "unlock_sanctuary_craft_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone": 12
      }
    },
    "unlock_sanctuary_craft_chance_v3": {
      "x": 400,
      "y": 2840,
      "parent": "unlock_sanctuary_craft_chance_v2",
      "size": "medium",
      "cost": {
        "brick": 8,
        "stone_slab": 8
      }
    },
    "unlock_sanctuary_craft_chance_v4": {
      "x": 400,
      "y": 3000,
      "parent": "unlock_sanctuary_craft_chance_v3",
      "size": "medium",
      "cost": {
        "brick": 12,
        "pitch": 5
      }
    },
    "unlock_sanctuary_craft_chance_v5": {
      "x": 400,
      "y": 3160,
      "parent": "unlock_sanctuary_craft_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "gear": 2
      }
    },
    "unlock_sanctuary_craft_power_v1": {
      "x": 640,
      "y": 2520,
      "parent": "unlock_sanctuary_craft",
      "size": "medium",
      "cost": {
        "plank": 10,
        "stone": 10
      }
    },
    "unlock_sanctuary_craft_power_v2": {
      "x": 640,
      "y": 2680,
      "parent": "unlock_sanctuary_craft_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 8,
        "plank": 12
      }
    },
    "unlock_sanctuary_craft_power_v3": {
      "x": 640,
      "y": 2840,
      "parent": "unlock_sanctuary_craft_power_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "clay": 10
      }
    },
    "unlock_sanctuary_craft_power_v4": {
      "x": 640,
      "y": 3000,
      "parent": "unlock_sanctuary_craft_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "glass": 6
      }
    },
    "unlock_sanctuary_craft_power_v5": {
      "x": 640,
      "y": 3160,
      "parent": "unlock_sanctuary_craft_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "gear": 2
      }
    },
    "unlock_sanctuary_war_chance_v1": {
      "x": 760,
      "y": 2520,
      "parent": "unlock_sanctuary_war",
      "size": "medium",
      "cost": {
        "wood": 14,
        "plank": 8
      }
    },
    "unlock_sanctuary_war_chance_v2": {
      "x": 760,
      "y": 2680,
      "parent": "unlock_sanctuary_war_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone_slab": 8
      }
    },
    "unlock_sanctuary_war_chance_v3": {
      "x": 760,
      "y": 2840,
      "parent": "unlock_sanctuary_war_chance_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      }
    },
    "unlock_sanctuary_war_chance_v4": {
      "x": 760,
      "y": 3000,
      "parent": "unlock_sanctuary_war_chance_v3",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "pitch": 5
      }
    },
    "unlock_sanctuary_war_chance_v5": {
      "x": 760,
      "y": 3160,
      "parent": "unlock_sanctuary_war_chance_v4",
      "size": "medium",
      "cost": {
        "steel": 2,
        "gear": 2
      }
    },
    "unlock_sanctuary_war_power_v1": {
      "x": 1000,
      "y": 2520,
      "parent": "unlock_sanctuary_war",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 12
      }
    },
    "unlock_sanctuary_war_power_v2": {
      "x": 1000,
      "y": 2680,
      "parent": "unlock_sanctuary_war_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 12
      }
    },
    "unlock_sanctuary_war_power_v3": {
      "x": 1000,
      "y": 2840,
      "parent": "unlock_sanctuary_war_power_v2",
      "size": "medium",
      "cost": {
        "brick": 12,
        "pitch": 6
      }
    },
    "unlock_sanctuary_war_power_v4": {
      "x": 1000,
      "y": 3000,
      "parent": "unlock_sanctuary_war_power_v3",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "glass": 6
      }
    },
    "unlock_sanctuary_war_power_v5": {
      "x": 1000,
      "y": 3160,
      "parent": "unlock_sanctuary_war_power_v4",
      "size": "medium",
      "cost": {
        "steel": 3,
        "gear": 2
      }
    },
    "unlock_sanctuary_eff_chance_v1": {
      "x": 1120,
      "y": 2520,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "wood": 16,
        "plank": 8
      }
    },
    "unlock_sanctuary_eff_chance_v2": {
      "x": 1120,
      "y": 2680,
      "parent": "unlock_sanctuary_eff_chance_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone": 12
      }
    },
    "unlock_sanctuary_eff_chance_v3": {
      "x": 1120,
      "y": 2840,
      "parent": "unlock_sanctuary_eff_chance_v2",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "brick": 8
      }
    },
    "unlock_sanctuary_eff_chance_v4": {
      "x": 1120,
      "y": 3000,
      "parent": "unlock_sanctuary_eff_chance_v3",
      "size": "medium",
      "cost": {
        "pitch": 6,
        "glass": 8
      }
    },
    "unlock_sanctuary_eff_chance_v5": {
      "x": 1120,
      "y": 3160,
      "parent": "unlock_sanctuary_eff_chance_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "lime": 4
      }
    },
    "unlock_sanctuary_eff_power_v1": {
      "x": 1360,
      "y": 2520,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "plank": 12,
        "stone": 10
      }
    },
    "unlock_sanctuary_eff_power_v2": {
      "x": 1360,
      "y": 2680,
      "parent": "unlock_sanctuary_eff_power_v1",
      "size": "medium",
      "cost": {
        "stone_slab": 10,
        "plank": 12
      }
    },
    "unlock_sanctuary_eff_power_v3": {
      "x": 1360,
      "y": 2840,
      "parent": "unlock_sanctuary_eff_power_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "resin": 8
      }
    },
    "unlock_sanctuary_eff_power_v4": {
      "x": 1360,
      "y": 3000,
      "parent": "unlock_sanctuary_eff_power_v3",
      "size": "medium",
      "cost": {
        "pitch": 8,
        "glass": 8
      }
    },
    "unlock_sanctuary_eff_power_v5": {
      "x": 1360,
      "y": 3160,
      "parent": "unlock_sanctuary_eff_power_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 5,
        "gear": 2
      }
    },
    "unlock_sanctuary_eff_duration_v1": {
      "x": 1600,
      "y": 2520,
      "parent": "unlock_sanctuary_efficiency",
      "size": "medium",
      "cost": {
        "wood": 14,
        "plank": 10
      }
    },
    "unlock_sanctuary_eff_duration_v2": {
      "x": 1600,
      "y": 2680,
      "parent": "unlock_sanctuary_eff_duration_v1",
      "size": "medium",
      "cost": {
        "plank": 14,
        "stone_slab": 8
      }
    },
    "unlock_sanctuary_eff_duration_v3": {
      "x": 1600,
      "y": 2840,
      "parent": "unlock_sanctuary_eff_duration_v2",
      "size": "medium",
      "cost": {
        "brick": 10,
        "clay": 10
      }
    },
    "unlock_sanctuary_eff_duration_v4": {
      "x": 1600,
      "y": 3000,
      "parent": "unlock_sanctuary_eff_duration_v3",
      "size": "medium",
      "cost": {
        "glass": 8,
        "pitch": 6
      }
    },
    "unlock_sanctuary_eff_duration_v5": {
      "x": 1600,
      "y": 3160,
      "parent": "unlock_sanctuary_eff_duration_v4",
      "size": "medium",
      "cost": {
        "iron_ingot": 4,
        "lime": 6
      }
    }
  }
};
if (typeof applyTechTreeTable === "function") applyTechTreeTable(window.TECH_TREE_TABLE);
