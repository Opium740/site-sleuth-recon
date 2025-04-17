
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScanButton } from "@/components/ScanButton";
import { ResultList } from "@/components/ResultList";
import { Warning } from "@/components/Warning";
import { DomainDisplay } from "@/components/DomainDisplay";
import { extractDomain, fetchSubdomains, scanPaths } from "@/lib/scanUtils";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Get the current tab's domain on component mount
  useEffect(() => {
    const getCurrentDomain = async () => {
      try {
        // Check if running in Chrome extension context
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.url) {
              setCurrentDomain(extractDomain(tabs[0].url));
            }
          });
        } else {
          // Fallback for web preview
          setCurrentDomain(extractDomain(window.location.href));
        }
      } catch (error) {
        console.error("Error getting current domain:", error);
      }
    };
    
    getCurrentDomain();
  }, []);
  
  const handleSubdomainScan = async () => {
    if (!currentDomain) return;
    
    try {
      setIsLoading(true);
      const results = await fetchSubdomains(currentDomain);
      setSubdomains(results);
    } catch (error) {
      console.error("Error during subdomain scan:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDirectoryScan = async () => {
    if (!currentDomain) return;
    
    try {
      setIsLoading(true);
      const results = await scanPaths(currentDomain);
      setDirectories(results);
    } catch (error) {
      console.error("Error during directory scan:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="extension-container mx-auto" style={{ width: '400px', maxHeight: '600px', overflow: 'auto' }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Site Sleuth Recon</CardTitle>
              <CardDescription className="text-xs">
                Website reconnaissance tool
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-sleuth-700">v1.0</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Warning />
          
          <DomainDisplay domain={currentDomain} />
          
          <Tabs defaultValue="subdomains" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="subdomains">Subdomains</TabsTrigger>
              <TabsTrigger value="directories">Directories</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subdomains" className="space-y-4">
              <ScanButton 
                label="Fetch Subdomains" 
                onClick={handleSubdomainScan}
                disabled={!currentDomain || isLoading}
                loading={isLoading && subdomains.length === 0}
              />
              
              <ResultList 
                title={`Subdomains (${subdomains.length})`} 
                results={subdomains} 
              />
            </TabsContent>
            
            <TabsContent value="directories" className="space-y-4">
              <ScanButton 
                label="Start Directory Scan" 
                onClick={handleDirectoryScan}
                disabled={!currentDomain || isLoading}
                loading={isLoading && directories.length === 0}
              />
              
              <ResultList 
                title={`Directories (${directories.length})`} 
                results={directories}
                isSuccess={true}
              />
            </TabsContent>
          </Tabs>
          
          <Separator className="my-4" />
          
          <div className="text-xs text-muted-foreground">
            Use the extension on any website to scan for subdomains and common directories.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
