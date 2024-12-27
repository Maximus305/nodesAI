"use client"

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Node, Edge, Connection, BackgroundVariant, ReactFlowProvider } from '@xyflow/react';
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Brain, Database, Cpu, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ReactFlow = dynamic(
  async () => {
    const { ReactFlow: Component } = await import('@xyflow/react');
    return Component;
  },
  {
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

interface NodeData {
  label: string;
  model?: string;
  inputs?: {
    type: string;
    name: string;
  }[];
  outputs?: {
    type: string;
    name: string;
  }[];
}

type CustomNodeProps = {
  data: NodeData;
  selected?: boolean;
  type?: string;
} & Pick<Node, 'id' | 'draggable' | 'selectable' | 'dragHandle'>;

const modelOptions = [
  'GPT-4',
  'Claude-3',
  'Gemini Pro',
  'Llama-2',
  'Mistral-7B'
];

const CustomNode: React.FC<CustomNodeProps & { color: string; icon: React.ReactNode; showModelSelect?: boolean; isStart?: boolean }> = 
  ({ data, color, icon, showModelSelect, selected, id, isStart }) => {
  return (
    <div className="group relative">
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 transition-all duration-300"
        style={{ 
          backgroundColor: 'white',
          borderColor: color,
          boxShadow: selected ? `0 0 10px ${color}80` : 'none'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 transition-all duration-300"
        style={{ 
          backgroundColor: 'white',
          borderColor: color,
          boxShadow: selected ? `0 0 10px ${color}80` : 'none'
        }} 
      />

      <div 
        className={`px-6 py-4 rounded-2xl transition-all duration-200
          ${selected ? 'shadow-lg' : 'shadow-sm'}
          hover:shadow-xl`}
        style={{
          backgroundColor: isStart ? '#4CAF82' : 'white',
          color: isStart ? 'white' : 'inherit',
          border: 'none',
          minWidth: '240px'
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-1.5" style={{ color: isStart ? 'white' : color }}>
              {icon}
            </div>
            <div className={`text-base ${isStart ? 'text-white' : 'text-gray-700'}`}>
              {data.label}
            </div>
          </div>
          
          {showModelSelect && (
            <div className="mt-3 text-xs text-gray-500">
              {data.inputs?.map((input, i) => (
                <div key={i} className="text-gray-400 mt-1">→ Uses: {input.name}</div>
              ))}
            </div>
          )}
          
          {showModelSelect && (
            <Select
              defaultValue={data.model || 'GPT-4'}
              onValueChange={(value) => {
                const event = new CustomEvent('nodeModelChanged', {
                  detail: { nodeId: id, model: value }
                });
                window.dispatchEvent(event);
              }}
            >
              <SelectTrigger 
                className="w-full text-xs border-gray-200"
                style={{ 
                  backgroundColor: `${color}08`,
                  borderColor: `${color}40`
                }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {modelOptions.map(model => (
                    <SelectItem key={model} value={model} className="text-sm">
                      {model}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
};

function AgentNode({ data, selected, id }: { data: NodeData; selected?: boolean; id: string }) {
  const isStart = data.label === "What's your name?";
  return <CustomNode 
    data={data} 
    selected={selected} 
    color="#4F46E5" 
    icon={<Brain className="w-4 h-4" style={{ color: isStart ? 'white' : '#4F46E5' }} />} 
    showModelSelect={!isStart} 
    id={id}
    isStart={isStart}
  />;
}

function ProcessorNode({ data, selected, id }: { data: NodeData; selected?: boolean; id: string }) {
  return <CustomNode data={data} selected={selected} color="#0EA5E9" icon={<Cpu className="w-4 h-4" />} id={id} />;
}

function DatabaseNode({ data, selected, id }: { data: NodeData; selected?: boolean; id: string }) {
  return <CustomNode data={data} selected={selected} color="#14B8A6" icon={<Database className="w-4 h-4" />} id={id} />;
}

const nodeTypes = {
  agent: AgentNode,
  processor: ProcessorNode,
  database: DatabaseNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'agent',
    position: { x: 400, y: 100 },
    data: { 
      label: "What's your name?", 
      model: 'GPT-4',
      outputs: [
        { type: 'string', name: 'name' }
      ]
    },
  },
  {
    id: '2',
    type: 'processor',
    position: { x: 300, y: 300 },
    data: { 
      label: 'How are you?',
      inputs: [
        { type: 'string', name: 'name' }
      ],
      outputs: [
        { type: 'string', name: 'mood' }
      ]
    },
  },
  {
    id: '3',
    type: 'database',
    position: { x: 200, y: 400 },
    data: { 
      label: 'Where are you from?',
      inputs: [
        { type: 'string', name: 'name' },
        { type: 'string', name: 'mood' }
      ],
      outputs: [
        { type: 'string', name: 'location' }
      ]
    },
  },
];

const getEdgeStyle = (type: string) => {
  return {
    stroke: '#6366F1',
    strokeWidth: 2,
    strokeDasharray: '5 5',
    opacity: 0.6,
  };
};

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: getEdgeStyle('agent')
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: getEdgeStyle('processor')
  },
];

type NodeType = 'agent' | 'processor' | 'database';

const FlowBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeType, setNodeType] = useState<NodeType>('agent');

  React.useEffect(() => {
    const handleModelChange = (event: CustomEvent) => {
      const { nodeId, model } = event.detail;
      setNodes(nodes => nodes.map(node => 
        node.id === nodeId ? { ...node, data: { ...node.data, model } } : node
      ));
    };

    window.addEventListener('nodeModelChanged', handleModelChange as EventListener);
    return () => window.removeEventListener('nodeModelChanged', handleModelChange as EventListener);
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: getEdgeStyle(nodeType)
    }, eds)),
    [setEdges, nodeType]
  );

  const addNode = useCallback(() => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: nodeType,
      position: { x: 400, y: (nodes.length + 1) * 200 },
      data: {
        label: nodeType === 'agent'
          ? 'What do you like to do?'
          : nodeType === 'processor'
            ? 'Tell me about yourself'
            : 'What are your interests?',
        ...(nodeType === 'agent' ? { model: 'GPT-4' } : {})
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes, nodeType]);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-full bg-gray-50 relative">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at center, #e2e8f0 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-16 z-10 flex items-center justify-between px-6 
          border-b border-gray-100 bg-white">
          <h1 className="text-base font-semibold text-gray-700">
            Neural Flow Architect
          </h1>
        </div>

        <div className="h-[calc(100vh-4rem)] w-full pt-16">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
            defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}
            minZoom={0.2}
            maxZoom={4}
            className="bg-transparent"
          >
            <Controls className="shadow-sm !bg-white !border-none rounded-lg" />
            <Panel position="top-right" className="m-6">
              <div className="flex items-center gap-2 bg-white shadow-sm rounded-lg p-3">
                <Select
                  value={nodeType}
                  onValueChange={(value: NodeType) => setNodeType(value)}
                >
                  <SelectTrigger className="w-40 bg-gray-50 border-gray-200 hover:border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="agent">AI Agent</SelectItem>
                      <SelectItem value="processor">Neural Processor</SelectItem>
                      <SelectItem value="database">Knowledge Base</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <button
                  onClick={addNode}
                  className="flex items-center justify-center gap-2 px-4 py-2 
                    rounded-md text-sm bg-blue-50 text-blue-600 font-medium
                    hover:bg-blue-100 transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Node
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </ReactFlowProvider>
  );
};

export default FlowBuilder;