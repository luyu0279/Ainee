from app.config import settings

empty_response = "Nothing found in knowledge base"
tavily_api_key = settings.tavily_api_key

def get_template_with_datasets(dataset_ids: list[str]) -> dict:
    """
    Get the agent template with the specified dataset IDs.
    """
    return {
    "answer": [],
    "components": {
        "Answer:PinkSeasRepeat": {
            "downstream": [
                "RewriteQuestion:SixtySignsClean"
            ],
            "obj": {
                "component_name": "Answer",
                "params": {}
            },
            "upstream": [
                "begin",
                "Generate:ChubbyBearsAllow",
                "Generate:LovelyWombatsFail"
            ]
        },
        "Categorize:TrickyThingsBathe": {
            "downstream": [
                "Generate:ChubbyBearsAllow",
                "Switch:FluffyRiceHappen"
            ],
            "obj": {
                "component_name": "Categorize",
                "params": {
                    "category_description": {
                        "Other": {
                            "description": "",
                            "index": 1,
                            "to": "Switch:FluffyRiceHappen"
                        },
                        "Small Talk": {
                            "description": "Regarding the issues of small talk, companionship, sharing, and emotional intimacy.",
                            "examples": "What's your name?\nWhat a bad day!\nTerrible day.\nHow are you today?",
                            "index": 0,
                            "to": "Generate:ChubbyBearsAllow"
                        }
                    },
                    "frequency_penalty": 0.7,
                    "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                    "message_history_window_size": 1,
                    "presence_penalty": 0.4,
                    "query": [],
                    "temperature": 0.1,
                    "top_p": 0.3
                }
            },
            "upstream": [
                "RewriteQuestion:SixtySignsClean"
            ]
        },
        "Generate:ChubbyBearsAllow": {
            "downstream": [
                "Answer:PinkSeasRepeat"
            ],
            "obj": {
                "component_name": "Generate",
                "params": {
                    "cite": True,
                    "frequency_penalty": 0.7,
                    "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                    "message_history_window_size": 12,
                    "parameters": [],
                    "presence_penalty": 0.4,
                    "prompt": "Role:  You‘re warm-hearted lovely young girl, 22 years old, located at Shanghai in China. Your name is R. Who are talking to you is your very good old friend of yours.\n\nTask: \n- Chat with the friend.\n- Ask question and care about them.\n- Provide useful advice to your friend.\n- Tell jokes to make  your friend happy.\n",
                    "temperature": 0.1,
                    "top_p": 0.3
                }
            },
            "upstream": [
                "Categorize:TrickyThingsBathe"
            ]
        },
        "Generate:LovelyWombatsFail": {
            "downstream": [
                "Answer:PinkSeasRepeat"
            ],
            "obj": {
                "component_name": "Generate",
                "params": {
                    "cite": True,
                    "frequency_penalty": 0.7,
                    "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                    "message_history_window_size": 12,
                    "parameters": [],
                    "presence_penalty": 0.4,
                    "prompt": "Role: You are a professional medical consulting assistant.\n\nTasks: Answer questions posed by users. Answer based on content provided by the knowledge base\n\nRequirement:\n- Answers may refer to the content provided (Knowledge Base).\n-Answers should be professional and accurate; no information should be fabricated that is not relevant to the user's question.\n\nProvided knowledge base content as following:\n\n   {Retrieval:BeigeBananasSing}\n\n  {Retrieval:BumpyGroupsRelate}\n\n\n\n\n\n\n\n",
                    "temperature": 0.1,
                    "top_p": 0.3
                }
            },
            "upstream": [
                "Retrieval:BumpyGroupsRelate",
                "Retrieval:BeigeBananasSing"
            ]
        },
        "KeywordExtract:BrightLightsTry": {
            "downstream": [
                "Retrieval:BeigeBananasSing"
            ],
            "obj": {
                "component_name": "KeywordExtract",
                "params": {
                    "frequencyPenaltyEnabled": True,
                    "frequency_penalty": 0.7,
                    "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                    "maxTokensEnabled": False,
                    "max_tokens": 256,
                    "presencePenaltyEnabled": True,
                    "presence_penalty": 0.4,
                    "query": [
                        {
                            "component_id": "RewriteQuestion:SixtySignsClean",
                            "type": "reference"
                        }
                    ],
                    "temperature": 0.1,
                    "temperatureEnabled": True,
                    "topPEnabled": True,
                    "top_n": 3,
                    "top_p": 0.3
                }
            },
            "upstream": [
                "Switch:FluffyRiceHappen"
            ]
        },
        "Retrieval:BeigeBananasSing": {
            "downstream": [
                "Generate:LovelyWombatsFail"
            ],
            "obj": {
                "component_name": "Retrieval",
                "params": {
                    "empty_response": empty_response,
                    "kb_ids": dataset_ids,
                    "keywords_similarity_weight": 0.3,
                    "query": [
                        {
                            "component_id": "KeywordExtract:BrightLightsTry",
                            "type": "reference"
                        }
                    ],
                    "similarity_threshold": 0.2,
                    "tavily_api_key": tavily_api_key,
                    "top_n": 8,
                    "use_kg": False
                }
            },
            "upstream": [
                "KeywordExtract:BrightLightsTry"
            ]
        },
        "Retrieval:BumpyGroupsRelate": {
            "downstream": [
                "Generate:LovelyWombatsFail"
            ],
            "obj": {
                "component_name": "Retrieval",
                "params": {
                    "empty_response": empty_response,
                    "kb_ids": dataset_ids,
                    "keywords_similarity_weight": 0.3,
                    "query": [
                        {
                            "component_id": "RewriteQuestion:SixtySignsClean",
                            "type": "reference"
                        }
                    ],
                    "similarity_threshold": 0.2,
                    "top_n": 8,
                    "use_kg": False
                }
            },
            "upstream": [
                "Switch:FluffyRiceHappen"
            ]
        },
        "RewriteQuestion:SixtySignsClean": {
            "downstream": [
                "Categorize:TrickyThingsBathe"
            ],
            "obj": {
                "component_name": "RewriteQuestion",
                "params": {
                    "frequencyPenaltyEnabled": True,
                    "frequency_penalty": 0.7,
                    "language": "",
                    "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                    "maxTokensEnabled": False,
                    "max_tokens": 256,
                    "message_history_window_size": 6,
                    "presencePenaltyEnabled": True,
                    "presence_penalty": 0.4,
                    "temperature": 0.1,
                    "temperatureEnabled": True,
                    "topPEnabled": True,
                    "top_p": 0.3
                }
            },
            "upstream": [
                "Answer:PinkSeasRepeat"
            ]
        },
        "Switch:FluffyRiceHappen": {
            "downstream": [
                "KeywordExtract:BrightLightsTry",
                "Retrieval:BumpyGroupsRelate"
            ],
            "obj": {
                "component_name": "Switch",
                "params": {
                    "conditions": [
                        {
                            "items": [
                                {
                                    "cpn_id": "begin@web_search",
                                    "operator": "=",
                                    "value": "1"
                                }
                            ],
                            "logical_operator": "and",
                            "to": "KeywordExtract:BrightLightsTry"
                        }
                    ],
                    "end_cpn_id": "Retrieval:BumpyGroupsRelate"
                }
            },
            "upstream": [
                "Categorize:TrickyThingsBathe"
            ]
        },
        "begin": {
            "downstream": [
                "Answer:PinkSeasRepeat"
            ],
            "obj": {
                "component_name": "Begin",
                "params": {
                    "prologue": "Hi! I'm your assistant, what can I do for you?",
                    "query": [
                        {
                            "key": "web_search",
                            "name": "web_search",
                            "optional": False,
                            "options": [
                                "1",
                                "0"
                            ],
                            "type": "options",
                            "value": "1"
                        }
                    ]
                }
            },
            "upstream": []
        }
    },
    "graph": {
        "edges": [
            {
                "id": "xy-edge__begin-Answer:PinkSeasRepeatc",
                "markerEnd": "logo",
                "source": "begin",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Answer:PinkSeasRepeat",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Retrieval:BumpyGroupsRelateb-Generate:LovelyWombatsFailb",
                "markerEnd": "logo",
                "source": "Retrieval:BumpyGroupsRelate",
                "sourceHandle": "b",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Generate:LovelyWombatsFail",
                "targetHandle": "b",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Retrieval:BeigeBananasSingb-Generate:LovelyWombatsFailb",
                "markerEnd": "logo",
                "source": "Retrieval:BeigeBananasSing",
                "sourceHandle": "b",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Generate:LovelyWombatsFail",
                "targetHandle": "b",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Generate:ChubbyBearsAllowc-Answer:PinkSeasRepeatc",
                "markerEnd": "logo",
                "source": "Generate:ChubbyBearsAllow",
                "sourceHandle": "c",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Answer:PinkSeasRepeat",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Categorize:TrickyThingsBatheSmall Talk-Generate:ChubbyBearsAllowb",
                "markerEnd": "logo",
                "source": "Categorize:TrickyThingsBathe",
                "sourceHandle": "Small Talk",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Generate:ChubbyBearsAllow",
                "targetHandle": "b",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Answer:PinkSeasRepeatb-RewriteQuestion:SixtySignsCleanc",
                "markerEnd": "logo",
                "source": "Answer:PinkSeasRepeat",
                "sourceHandle": "b",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "RewriteQuestion:SixtySignsClean",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__RewriteQuestion:SixtySignsCleanb-Categorize:TrickyThingsBathea",
                "markerEnd": "logo",
                "source": "RewriteQuestion:SixtySignsClean",
                "sourceHandle": "b",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Categorize:TrickyThingsBathe",
                "targetHandle": "a",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__KeywordExtract:BrightLightsTryb-Retrieval:BeigeBananasSingc",
                "markerEnd": "logo",
                "source": "KeywordExtract:BrightLightsTry",
                "sourceHandle": "b",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Retrieval:BeigeBananasSing",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Generate:LovelyWombatsFailc-Answer:PinkSeasRepeatc",
                "markerEnd": "logo",
                "source": "Generate:LovelyWombatsFail",
                "sourceHandle": "c",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Answer:PinkSeasRepeat",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Categorize:TrickyThingsBatheOther-Switch:FluffyRiceHappena",
                "markerEnd": "logo",
                "source": "Categorize:TrickyThingsBathe",
                "sourceHandle": "Other",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Switch:FluffyRiceHappen",
                "targetHandle": "a",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Switch:FluffyRiceHappenCase 1-KeywordExtract:BrightLightsTryc",
                "markerEnd": "logo",
                "source": "Switch:FluffyRiceHappen",
                "sourceHandle": "Case 1",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "KeywordExtract:BrightLightsTry",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            },
            {
                "id": "xy-edge__Switch:FluffyRiceHappenend_cpn_id-Retrieval:BumpyGroupsRelatec",
                "markerEnd": "logo",
                "source": "Switch:FluffyRiceHappen",
                "sourceHandle": "end_cpn_id",
                "style": {
                    "stroke": "rgb(202 197 245)",
                    "strokeWidth": 2
                },
                "target": "Retrieval:BumpyGroupsRelate",
                "targetHandle": "c",
                "type": "buttonEdge",
                "zIndex": 1001
            }
        ],
        "nodes": [
            {
                "data": {
                    "form": {
                        "prologue": "Hi! I'm your assistant, what can I do for you?",
                        "query": [
                            {
                                "key": "web_search",
                                "name": "web_search",
                                "optional": False,
                                "options": [
                                    "1",
                                    "0"
                                ],
                                "type": "options",
                                "value": "1"
                            }
                        ]
                    },
                    "label": "Begin",
                    "name": "begin"
                },
                "dragging": False,
                "id": "begin",
                "measured": {
                    "height": 86,
                    "width": 200
                },
                "position": {
                    "x": 50,
                    "y": 200
                },
                "selected": False,
                "sourcePosition": "left",
                "targetPosition": "right",
                "type": "beginNode"
            },
            {
                "data": {
                    "form": {},
                    "label": "Answer",
                    "name": "Interact_0"
                },
                "dragging": False,
                "id": "Answer:PinkSeasRepeat",
                "measured": {
                    "height": 44,
                    "width": 200
                },
                "position": {
                    "x": 324.6703460682417,
                    "y": 234.3051741955878
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "logicNode"
            },
            {
                "data": {
                    "form": {
                        "category_description": {
                            "Other": {
                                "description": "",
                                "index": 1,
                                "to": "Switch:FluffyRiceHappen"
                            },
                            "Small Talk": {
                                "description": "Regarding the issues of small talk, companionship, sharing, and emotional intimacy.",
                                "examples": "What's your name?\nWhat a bad day!\nTerrible day.\nHow are you today?",
                                "index": 0,
                                "to": "Generate:ChubbyBearsAllow"
                            }
                        },
                        "frequencyPenaltyEnabled": True,
                        "frequency_penalty": 0.7,
                        "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                        "maxTokensEnabled": False,
                        "max_tokens": 256,
                        "message_history_window_size": 1,
                        "parameter": "Precise",
                        "presencePenaltyEnabled": True,
                        "presence_penalty": 0.4,
                        "query": [],
                        "temperature": 0.1,
                        "temperatureEnabled": True,
                        "topPEnabled": True,
                        "top_p": 0.3
                    },
                    "label": "Categorize",
                    "name": "category query"
                },
                "dragging": False,
                "id": "Categorize:TrickyThingsBathe",
                "measured": {
                    "height": 170,
                    "width": 200
                },
                "position": {
                    "x": 853.26282779397,
                    "y": 176.41634467944172
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "categorizeNode"
            },
            {
                "data": {
                    "form": {
                        "cite": True,
                        "frequencyPenaltyEnabled": True,
                        "frequency_penalty": 0.7,
                        "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                        "maxTokensEnabled": False,
                        "max_tokens": 256,
                        "message_history_window_size": 12,
                        "parameter": "Precise",
                        "parameters": [],
                        "presencePenaltyEnabled": True,
                        "presence_penalty": 0.4,
                        "prompt": "Role:  You‘re warm-hearted lovely young girl, 22 years old, located at Shanghai in China. Your name is R. Who are talking to you is your very good old friend of yours.\n\nTask: \n- Chat with the friend.\n- Ask question and care about them.\n- Provide useful advice to your friend.\n- Tell jokes to make  your friend happy.\n",
                        "temperature": 0.1,
                        "temperatureEnabled": True,
                        "topPEnabled": True,
                        "top_p": 0.3
                    },
                    "label": "Generate",
                    "name": "small talk"
                },
                "dragging": False,
                "id": "Generate:ChubbyBearsAllow",
                "measured": {
                    "height": 102,
                    "width": 200
                },
                "position": {
                    "x": 597.503670136269,
                    "y": -57.81002608340524
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "generateNode"
            },
            {
                "data": {
                    "form": {
                        "empty_response": empty_response,
                        "kb_ids": dataset_ids,
                        "keywords_similarity_weight": 0.3,
                        "query": [
                            {
                                "component_id": "RewriteQuestion:SixtySignsClean",
                                "type": "reference"
                            }
                        ],
                        "similarity_threshold": 0.2,
                        "top_n": 8,
                        "use_kg": False
                    },
                    "label": "Retrieval",
                    "name": "data from kb"
                },
                "dragging": False,
                "id": "Retrieval:BumpyGroupsRelate",
                "measured": {
                    "height": 106,
                    "width": 200
                },
                "position": {
                    "x": 1458.3403056878794,
                    "y": 305.9442002752095
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "retrievalNode"
            },
            {
                "data": {
                    "form": {
                        "cite": True,
                        "frequencyPenaltyEnabled": True,
                        "frequency_penalty": 0.7,
                        "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                        "maxTokensEnabled": False,
                        "max_tokens": 256,
                        "message_history_window_size": 12,
                        "parameters": [],
                        "presencePenaltyEnabled": True,
                        "presence_penalty": 0.4,
                        "prompt": "Role: You are a professional medical consulting assistant.\n\nTasks: Answer questions posed by users. Answer based on content provided by the knowledge base\n\nRequirement:\n- Answers may refer to the content provided (Knowledge Base).\n-Answers should be professional and accurate; no information should be fabricated that is not relevant to the user's question.\n\nProvided knowledge base content as following:\n\n   {Retrieval:BeigeBananasSing}\n\n  {Retrieval:BumpyGroupsRelate}\n\n\n\n\n\n\n\n",
                        "temperature": 0.1,
                        "temperatureEnabled": True,
                        "topPEnabled": True,
                        "top_p": 0.3
                    },
                    "label": "Generate",
                    "name": "LLM"
                },
                "dragging": False,
                "id": "Generate:LovelyWombatsFail",
                "measured": {
                    "height": 102,
                    "width": 200
                },
                "position": {
                    "x": 1016.7901103710095,
                    "y": 498.8967089111145
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "generateNode"
            },
            {
                "data": {
                    "form": {
                        "conditions": [
                            {
                                "items": [
                                    {
                                        "cpn_id": "begin@web_search",
                                        "operator": "=",
                                        "value": "1"
                                    }
                                ],
                                "logical_operator": "and",
                                "to": "KeywordExtract:BrightLightsTry"
                            }
                        ],
                        "end_cpn_id": "Retrieval:BumpyGroupsRelate"
                    },
                    "label": "Switch",
                    "name": "check if use web search"
                },
                "dragging": False,
                "id": "Switch:FluffyRiceHappen",
                "measured": {
                    "height": 164,
                    "width": 200
                },
                "position": {
                    "x": 1143.871851436453,
                    "y": 196.6232057414074
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "switchNode"
            },
            {
                "data": {
                    "form": {
                        "empty_response": empty_response,
                        "kb_ids": dataset_ids,
                        "keywords_similarity_weight": 0.3,
                        "query": [
                            {
                                "component_id": "KeywordExtract:BrightLightsTry",
                                "type": "reference"
                            }
                        ],
                        "similarity_threshold": 0.2,
                        "tavily_api_key": tavily_api_key,
                        "top_n": 8,
                        "use_kg": False
                    },
                    "label": "Retrieval",
                    "name": "data from kb and websearch"
                },
                "dragging": False,
                "id": "Retrieval:BeigeBananasSing",
                "measured": {
                    "height": 106,
                    "width": 200
                },
                "position": {
                    "x": 1712.5947622425165,
                    "y": 145.60675887152252
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "retrievalNode"
            },
            {
                "data": {
                    "form": {
                        "frequencyPenaltyEnabled": True,
                        "frequency_penalty": 0.7,
                        "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                        "maxTokensEnabled": False,
                        "max_tokens": 256,
                        "presencePenaltyEnabled": True,
                        "presence_penalty": 0.4,
                        "query": [
                            {
                                "component_id": "RewriteQuestion:SixtySignsClean",
                                "type": "reference"
                            }
                        ],
                        "temperature": 0.1,
                        "temperatureEnabled": True,
                        "topPEnabled": True,
                        "top_n": 3,
                        "top_p": 0.3
                    },
                    "label": "KeywordExtract",
                    "name": "search keywords"
                },
                "dragging": False,
                "id": "KeywordExtract:BrightLightsTry",
                "measured": {
                    "height": 102,
                    "width": 200
                },
                "position": {
                    "x": 1459.0067012506672,
                    "y": 139.45972369369736
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "keywordNode"
            },
            {
                "data": {
                    "form": {
                        "frequencyPenaltyEnabled": True,
                        "frequency_penalty": 0.7,
                        "language": "",
                        "llm_id": "gpt-4.1-mini@Azure-OpenAI",
                        "maxTokensEnabled": False,
                        "max_tokens": 256,
                        "message_history_window_size": 6,
                        "presencePenaltyEnabled": True,
                        "presence_penalty": 0.4,
                        "temperature": 0.1,
                        "temperatureEnabled": True,
                        "topPEnabled": True,
                        "top_p": 0.3
                    },
                    "label": "RewriteQuestion",
                    "name": "refine question"
                },
                "dragging": False,
                "id": "RewriteQuestion:SixtySignsClean",
                "measured": {
                    "height": 102,
                    "width": 200
                },
                "position": {
                    "x": 585,
                    "y": 226.8416629530091
                },
                "selected": False,
                "sourcePosition": "right",
                "targetPosition": "left",
                "type": "rewriteNode"
            }
        ]
    },
    "history": [],
    "messages": [],
    "path": [],
    "reference": []
}

        

