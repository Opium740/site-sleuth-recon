
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
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [subdomains, setSubdomains] = useState<string[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  
  // Get the current tab's domain on component mount
  useEffect(() => {
    const getCurrentDomain = async () => {
      try {
        console.log("Getting current domain...");
        // Check if running in Chrome extension context
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          console.log("Using Chrome API to get current tab");
          chrome.tabs?.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.url) {
              const domain = extractDomain(tabs[0].url);
              console.log("Current domain:", domain);
              setCurrentDomain(domain);
            } else {
              console.log("No URL found in current tab");
              toast({
                title: "Error",
                description: "Could not detect the current website URL. Please try again.",
                variant: "destructive"
              });
            }
          });
        } else {
          // Fallback for web preview
          console.log("Using window.location for domain (web preview)");
          setCurrentDomain(extractDomain(window.location.href) || "example.com");
        }
      } catch (error) {
        console.error("Error getting current domain:", error);
        toast({
          title: "Error",
          description: "Failed to detect domain: " + (error instanceof Error ? error.message : String(error)),
          variant: "destructive"
        });
      }
    };
    
    getCurrentDomain();
  }, []);
  
  const handleSubdomainScan = async () => {
    if (!currentDomain) {
      toast({
        title: "Error",
        description: "No domain detected to scan",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setActiveOperation('subdomains');
      console.log(`Scanning subdomains for: ${currentDomain}`);
      
      const results = await fetchSubdomains(currentDomain);
      console.log(`Found ${results.length} subdomains`);
      setSubdomains(results);
      
      if (results.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Found ${results.length} subdomains`,
        });
      } else {
        toast({
          title: "No Results",
          description: "No subdomains found",
        });
      }
    } catch (error) {
      console.error("Error during subdomain scan:", error);
      toast({
        title: "Scan Failed",
        description: "Error scanning subdomains: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
    }
  };
  
  const handleDirectoryScan = async () => {
    if (!currentDomain) {
      toast({
        title: "Error",
        description: "No domain detected to scan",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setActiveOperation('directories');
      console.log(`Scanning directories for: ${currentDomain}`);
      
      const results = await scanPaths(currentDomain);
      console.log(`Found ${results.length} accessible directories`);
      setDirectories(results);
      
      if (results.length > 0) {
        toast({
          title: "Scan Complete",
          description: `Found ${results.length} accessible directories`,
        });
      } else {
        toast({
          title: "No Results",
          description: "No accessible directories found",
        });
      }
    } catch (error) {
      console.error("Error during directory scan:", error);
      toast({
        title: "Scan Failed",
        description: "Error scanning directories: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setActiveOperation(null);
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
                loading={isLoading && activeOperation === 'subdomains'}
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
                loading={isLoading && activeOperation === 'directories'}
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
