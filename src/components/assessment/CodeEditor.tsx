
'use client';
import { useState, useTransition } from 'react';
import Editor from '@monaco-editor/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from '@/components/ui/button';
import { Loader2, Play, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runCode } from '@/ai/flows/run-code-flow';
import type { Question, CodeExecutionResult, UserResponse } from '@/lib/types';

interface CodeEditorProps {
    question: Question;
    response: Partial<UserResponse>;
    onResponseChange: (change: Partial<UserResponse>) => void;
}

export function CodeEditor({ question, response, onResponseChange }: CodeEditorProps) {
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState('testcases');
    const { toast } = useToast();

    const code = response.code || question.starterCode || '';
    const language = response.language || 'javascript';
    const executionResult = response.executionResult;

    const handleRunCode = () => {
        startTransition(async () => {
            toast({ title: 'Running Code...', description: 'Please wait while we evaluate your solution.' });
            try {
                const result = await runCode({
                    code,
                    language,
                    testCases: question.testCases || [],
                });

                if (result) {
                    onResponseChange({ executionResult: result as CodeExecutionResult[] });
                    setActiveTab('output');
                    toast({ title: 'Execution Finished!', description: 'Check the output panel for results.' });
                } else {
                    throw new Error("Evaluation result was not found in the AI's response.");
                }
            } catch (error) {
                console.error('Code execution failed:', error);
                toast({ title: 'Execution Error', description: (error as Error).message || 'An unexpected error occurred.', variant: 'destructive' });
            }
        });
    }

    const passedCount = executionResult?.filter(r => r.status === 'Passed').length || 0;
    const totalCount = question.testCases?.length || 0;

    return (
        <div className="flex flex-col h-full">
            <Tabs defaultValue="testcases" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                    <TabsTrigger value="output">Output</TabsTrigger>
                </TabsList>
                <TabsContent value="testcases" className="mt-4">
                    <div className="space-y-4">
                        {question.testCases?.map((tc, index) => (
                            <div key={index} className="text-sm p-3 bg-muted/50 rounded-md">
                                <p className="font-semibold">Case {index + 1}</p>
                                <p><span className="text-muted-foreground">Input:</span> <code className="bg-background/80 px-1 rounded">{tc.input}</code></p>
                                <p><span className="text-muted-foreground">Expected Output:</span> <code className="bg-background/80 px-1 rounded">{tc.expectedOutput}</code></p>
                            </div>
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="output" className="mt-4">
                    {executionResult ? (
                        <div className="space-y-4">
                            <div className={`p-3 rounded-md text-lg font-bold flex items-center gap-2 ${passedCount === totalCount ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {passedCount === totalCount ? <CheckCircle /> : <AlertTriangle />}
                                Result: {passedCount} / {totalCount} Test Cases Passed
                            </div>
                            {executionResult.map((result, index) => (
                                <Card key={index} className={`border-l-4 ${result.status === 'Passed' ? 'border-green-500' : 'border-red-500'}`}>
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base flex justify-between items-center">
                                            <span>Test Case {index + 1}: <span className={result.status === 'Passed' ? 'text-green-500' : 'text-red-500'}>{result.status}</span></span>
                                            <div className="text-xs text-muted-foreground flex gap-4">
                                                <span><Clock className="inline h-3 w-3 mr-1" />{result.time}</span>
                                                <span>{result.memory}</span>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 text-xs font-mono space-y-1">
                                        <p><span className="font-sans font-semibold text-muted-foreground">Output:</span> <code className="bg-muted/50 px-1 rounded">{result.output}</code></p>
                                        {result.status !== 'Passed' && <p><span className="font-sans font-semibold text-muted-foreground">Expected:</span> <code className="bg-muted/50 px-1 rounded">{result.expectedOutput}</code></p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>Run your code to see the output here.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <div className="h-[60vh] flex flex-col border-t mt-4">
                <div className="flex-shrink-0 p-2 border-b flex justify-between items-center bg-background/80 sticky top-[80px] z-10">
                    <Select value={language} onValueChange={(lang) => onResponseChange({ language: lang })}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="typescript">TypeScript</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="csharp">C#</SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                            <SelectItem value="rust">Rust</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handleRunCode} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Run Code
                    </Button>
                </div>
                <div className="flex-grow">
                    <Editor
                        height="100%"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => onResponseChange({ code: value || '' })}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: 'on',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
